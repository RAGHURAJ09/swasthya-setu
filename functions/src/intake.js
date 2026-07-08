/**
 * Module E — Multilingual Voice/Text Intake
 *
 * Flow:
 *   1. Staff speaks (or types) in Hindi/Marathi/Bengali/English
 *   2. Cloud Speech-to-Text transcribes audio (base64 in request)
 *   3. Cloud Translation API → English
 *   4. Gemini API extracts structured JSON (medicine/quantity/action or footfall)
 *   5. Firestore write with confirmation
 *   6. Text-to-Speech synthesises audio confirmation back to staff
 *
 * Endpoints:
 *   POST /intake/voice          → { audioBase64, language, facilityId, recordType }
 *   POST /intake/text           → { text, language, facilityId, recordType }
 *   POST /intake/tts            → { text, language } → { audioBase64 }
 *
 * Supported languages: hi-IN (Hindi), mr-IN (Marathi), bn-IN (Bengali), en-IN (English)
 */

'use strict';

const functions = require('firebase-functions');
const admin     = require('firebase-admin');
const axios     = require('axios');

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const GEMINI_URL   = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const GEMINI_KEY   = functions.config().gemini?.key || process.env.GEMINI_API_KEY;
const GCP_KEY      = functions.config().gcp?.key    || process.env.GCP_API_KEY || GEMINI_KEY; 
const GROQ_KEY     = functions.config().groq?.key   || process.env.GROQ_API_KEY;

const LANG_CODES = {
  'hi': 'hi-IN', 'hi-IN': 'hi-IN',
  'mr': 'mr-IN', 'mr-IN': 'mr-IN',
  'bn': 'bn-IN', 'bn-IN': 'bn-IN',
  'en': 'en-IN', 'en-IN': 'en-IN',
};

// ─── Speech-to-Text ───────────────────────────────────────────────────────────

async function speechToText(audioBase64, languageCode) {
  if (!GROQ_KEY) {
    // Fallback to Google Cloud Speech-to-Text if no Groq Key is available
    const lang = LANG_CODES[languageCode] || 'hi-IN';
    const res  = await axios.post(
      `https://speech.googleapis.com/v1/speech:recognize?key=${GCP_KEY}`,
      {
        config: {
          encoding:        'WEBM_OPUS',
          sampleRateHertz: 48000,
          languageCode:    lang,
          alternativeLanguageCodes: ['hi-IN', 'en-IN'],
          model:           'latest_short',
          enableAutomaticPunctuation: true,
        },
        audio: { content: audioBase64 },
      }
    );
    const transcript = res.data?.results?.[0]?.alternatives?.[0]?.transcript || '';
    const confidence = res.data?.results?.[0]?.alternatives?.[0]?.confidence || 0;
    return { transcript, confidence, detectedLanguage: lang };
  }

  // Use Groq Whisper API
  try {
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    const formData = new FormData();
    // Groq API supports WEBM. We append it as audio.webm.
    formData.append('file', new Blob([audioBuffer], { type: 'audio/webm' }), 'audio.webm');
    formData.append('model', 'whisper-large-v3');
    
    // Map language code to ISO 639-1 (e.g. 'hi-IN' -> 'hi', 'mr-IN' -> 'mr')
    const lang = (languageCode || 'hi').split('-')[0];
    formData.append('language', lang);

    const res = await axios.post(
      'https://api.groq.com/openai/v1/audio/transcriptions',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${GROQ_KEY}`,
        },
      }
    );

    const transcript = res.data?.text || '';
    return { transcript, confidence: 0.99, detectedLanguage: languageCode };
  } catch (error) {
    console.error('Groq Speech-to-Text failed:', error.response?.data || error.message);
    throw error;
  }
}

// ─── Translation ──────────────────────────────────────────────────────────────

async function translateToEnglish(text, sourceLanguage) {
  const source = (sourceLanguage || 'hi').split('-')[0];
  if (source === 'en') return { translatedText: text, sourceLanguage: 'en' };

  const res = await axios.post(
    `https://translation.googleapis.com/language/translate/v2?key=${GCP_KEY}`,
    { q: text, source, target: 'en', format: 'text' }
  );
  return {
    translatedText: res.data?.data?.translations?.[0]?.translatedText || text,
    sourceLanguage: source,
  };
}

// ─── Gemini structured extraction ─────────────────────────────────────────────

async function extractStructuredData(englishText, recordType) {
  if (!GEMINI_KEY) return null;

  const schema = recordType === 'footfall'
    ? `{"patientCount": number, "department": "opd"|"emergency"|"maternity"|"other", "notes": string}`
    : `{"medicineName": string, "quantity": number|null, "unit": string|null, "action": "restock"|"low_stock"|"stockout"|"consumed"|"unknown"}`;

  const prompt = `Extract structured data from this PHC staff message. Return ONLY valid JSON matching the schema. No markdown.
Message: "${englishText}"
Record type: ${recordType}
Schema: ${schema}`;

  try {
    const res = await axios.post(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 200,
        responseMimeType: 'application/json',
      },
    });
    const raw = res.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '{}';
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch { return null; }
}

// ─── Firestore write ──────────────────────────────────────────────────────────

async function writeToFirestore(facilityId, recordType, structured, rawTranscript, language) {
  const today = new Date().toISOString().split('T')[0];

  if (recordType === 'stock' && structured?.medicineName) {
    // Find matching stock doc
    const snap = await db.collection('phcs').doc(facilityId)
      .collection('stock')
      .where('medicineName', '>=', structured.medicineName.substring(0, 4))
      .limit(5).get();

    const match = snap.docs.find(d =>
      d.data().medicineName?.toLowerCase().includes(structured.medicineName.toLowerCase().slice(0, 5))
    );

    if (match && structured.quantity != null) {
      const update = {
        lastUpdatedBy:    'voice',
        lastUpdatedAt:    admin.firestore.FieldValue.serverTimestamp(),
        voiceTranscript:  rawTranscript,
        voiceLanguage:    language,
      };
      if (structured.action === 'restock') {
        update.currentQty = (match.data().currentQty || 0) + structured.quantity;
        update.lastRestocked = today;
      } else {
        update.currentQty = structured.quantity; // absolute update
      }
      await match.ref.update(update);
      return { written: true, docId: match.id, collection: 'stock', data: update };
    }
  }

  if (recordType === 'footfall' && structured?.patientCount) {
    const ref = db.collection('phcs').doc(facilityId).collection('footfall').doc(today);
    const existing = await ref.get();
    const prev = existing.exists ? existing.data() : {};
    await ref.set({
      date: today,
      patientCount: (prev.patientCount || 0) + (structured.patientCount || 0),
      departments: {
        ...(prev.departments || {}),
        [structured.department || 'opd']: structured.patientCount,
      },
      source: 'voice',
      voiceTranscript: rawTranscript,
      voiceLanguage:   language,
      recordedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    return { written: true, docId: today, collection: 'footfall', data: structured };
  }

  return { written: false, reason: 'Could not parse or match record' };
}

// ─── Text-to-Speech confirmation ──────────────────────────────────────────────

async function textToSpeech(text, languageCode) {
  const lang = LANG_CODES[languageCode] || 'hi-IN';
  const langBase = lang.split('-')[0];

  // Voice name map
  const voices = {
    'hi-IN': 'hi-IN-Wavenet-C',
    'mr-IN': 'mr-IN-Standard-A',
    'bn-IN': 'bn-IN-Standard-A',
    'en-IN': 'en-IN-Wavenet-B',
  };

  const res = await axios.post(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GCP_KEY}`,
    {
      input: { text },
      voice: { languageCode: lang, name: voices[lang] || `${lang}-Standard-A` },
      audioConfig: { audioEncoding: 'MP3', speakingRate: 0.9 },
    }
  );
  return res.data?.audioContent || null;
}

// ─── Confirmation message builder ──────────────────────────────────────────────

function buildConfirmation(recordType, structured, writeResult, language) {
  const lang = (language || 'hi').split('-')[0];
  if (!writeResult.written) {
    const msgs = {
      hi: `माफ करें, डेटा समझ नहीं आया। कृपया दोबारा बोलें।`,
      mr: `माफ करा, डेटा समजले नाही. कृपया पुन्हा बोला.`,
      bn: `দুঃখিত, তথ্য বোঝা যায়নি। আবার বলুন।`,
      en: `Sorry, could not understand the data. Please try again.`,
    };
    return msgs[lang] || msgs.en;
  }

  if (recordType === 'stock' && structured?.medicineName) {
    const msgs = {
      hi: `ठीक है। ${structured.medicineName} का स्टॉक अपडेट हो गया — ${structured.quantity || ''} यूनिट। धन्यवाद।`,
      mr: `ठीक आहे. ${structured.medicineName} चा साठा अपडेट झाला — ${structured.quantity || ''} युनिट. धन्यवाद.`,
      bn: `ঠিক আছে। ${structured.medicineName}-এর স্টক আপডেট হয়েছে — ${structured.quantity || ''} ইউনিট। ধন্যবাদ।`,
      en: `Done. ${structured.medicineName} stock updated to ${structured.quantity || 'recorded'}. Thank you.`,
    };
    return msgs[lang] || msgs.en;
  }

  if (recordType === 'footfall') {
    const msgs = {
      hi: `ठीक है। आज ${structured?.patientCount || ''} मरीज़ों की जानकारी दर्ज हो गई।`,
      mr: `ठीक आहे. आज ${structured?.patientCount || ''} रुग्णांची नोंद झाली.`,
      bn: `ঠিক আছে। আজ ${structured?.patientCount || ''} রোগীর তথ্য নথিভুক্ত হয়েছে।`,
      en: `Done. ${structured?.patientCount || ''} patients recorded for today.`,
    };
    return msgs[lang] || msgs.en;
  }

  return 'Data recorded successfully.';
}

// ─── HTTP Handlers ─────────────────────────────────────────────────────────────

async function handleVoiceIntake(req, res) {
  const { audioBase64, language = 'hi', facilityId, recordType = 'stock' } = req.body;
  if (!audioBase64 || !facilityId) {
    return res.status(400).json({ success: false, error: 'audioBase64 and facilityId required' });
  }

  try {
    const { transcript, confidence } = await speechToText(audioBase64, language);
    if (!transcript) return res.status(422).json({ success: false, error: 'Could not transcribe audio' });

    const { translatedText } = await translateToEnglish(transcript, language);
    const structured  = await extractStructuredData(translatedText, recordType);
    const writeResult = structured
      ? await writeToFirestore(facilityId, recordType, structured, transcript, language)
      : { written: false, reason: 'Extraction failed' };

    const confirmText = buildConfirmation(recordType, structured, writeResult, language);
    let confirmAudio  = null;
    try { confirmAudio = await textToSpeech(confirmText, language); } catch (_) {}

    res.json({
      success: true,
      data: { transcript, confidence, translatedText, structured, writeResult, confirmText, confirmAudio },
    });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
}

async function handleTextIntake(req, res) {
  const { text, language = 'hi', facilityId, recordType = 'stock' } = req.body;
  if (!text || !facilityId) {
    return res.status(400).json({ success: false, error: 'text and facilityId required' });
  }

  try {
    const { translatedText } = await translateToEnglish(text, language);
    const structured  = await extractStructuredData(translatedText, recordType);
    const writeResult = structured
      ? await writeToFirestore(facilityId, recordType, structured, text, language)
      : { written: false, reason: 'Extraction failed' };

    const confirmText = buildConfirmation(recordType, structured, writeResult, language);
    res.json({ success: true, data: { originalText: text, translatedText, structured, writeResult, confirmText } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
}

async function handleTTS(req, res) {
  const { text, language = 'hi' } = req.body;
  if (!text) return res.status(400).json({ success: false, error: 'text required' });
  try {
    const audioBase64 = await textToSpeech(text, language);
    res.json({ success: true, data: { audioBase64, mimeType: 'audio/mp3' } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
}

module.exports = { handleVoiceIntake, handleTextIntake, handleTTS };
