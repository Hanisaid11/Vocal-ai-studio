import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

  // Helper to initialize GoogleGenAI safely with system key
  const getAIClient = () => {
    return new GoogleGenAI();
  };

  /**
   * POST /api/coach/evaluate
   * Evaluates the user's pitch performance on a specific step with professional vocal coaching.
   */
  app.post('/api/coach/evaluate', async (req, res) => {
    try {
      const {
        stepNumber = 1,
        totalSteps = 5,
        stepTitle = 'Pitch Match',
        category = 'Warmup',
        targetNote = 'C4',
        sungNote = 'C4',
        cents = 0,
        stabilityScore = 85,
        userVoiceType = 'Tenor',
        lowestNote = 'C3',
        highestNote = 'G4',
        language = 'en',
      } = req.body;

      const prompt = `You are a world-class professional vocal coach in the mobile app VocalMaster Pro.
A student just completed this step of their vocal workout:
- Step: ${stepNumber}/${totalSteps} ("${stepTitle}")
- Category: ${category}
- Target Pitch: ${targetNote}
- User Detected Pitch: ${sungNote}
- Deviation: ${cents > 0 ? `+${cents}` : cents} cents
- Tone Stability: ${Math.round(stabilityScore)}%
- Singer Register: ${userVoiceType} (${lowestNote} to ${highestNote})
- Response Language: ${language === 'ar' ? 'Arabic (اللغة العربية الفصحى)' : 'English'}

Provide concise, encouraging, highly professional vocal coaching feedback (2-3 sentences max).
Highlight what they did right, address any breath support or throat tension hints, and give 1 practical instruction for their next note. Do not use generic praise; be specific and pedagogical.`;

      try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
        });

        res.json({ feedback: response.text });
      } catch (geminiError: any) {
        console.warn('Gemini evaluation fallback:', geminiError.message);
        // High-quality pedagogical fallback if API key or network is unreachable
        const fallback = language === 'ar'
          ? `أداء متقن في خطوة "${stepTitle}"! ثبات نبرتك وصل إلى ${Math.round(stabilityScore)}%. حافظ على رخاوة الفك وتوسيع القفص الصدري لدعم رنين الصوت بدون شد الحبال الصوتية.`
          : `Great work on "${stepTitle}"! Your pitch stability reached ${Math.round(stabilityScore)}%. Keep your lower jaw relaxed and engage your lower abdominals to keep the tone vibrant and strain-free.`;
        res.json({ feedback: fallback });
      }
    } catch (err: any) {
      console.error('Server error in /api/coach/evaluate:', err);
      res.status(500).json({ error: err.message || 'Evaluation failed' });
    }
  });

  /**
   * POST /api/coach/ask
   * Answers a vocal technique question from the singer.
   */
  app.post('/api/coach/ask', async (req, res) => {
    try {
      const {
        question,
        userVoiceType = 'Vocalist',
        lowestNote = 'C3',
        highestNote = 'C5',
        currentStep = 'General',
        language = 'en',
      } = req.body;

      if (!question || typeof question !== 'string') {
        return res.status(400).json({ error: 'Question is required' });
      }

      const prompt = `You are an elite vocal coach and voice scientist answering a question from a singer in VocalMaster Pro.
Student Profile:
- Voice Type: ${userVoiceType} (${lowestNote} – ${highestNote})
- Current Context: ${currentStep}
- Language: ${language === 'ar' ? 'Arabic (اللغة العربية)' : 'English'}

Question: "${question}"

Provide a warm, anatomically accurate, and practical answer (under 80 words). Give immediate advice the singer can test right now.`;

      try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
        });

        res.json({ reply: response.text });
      } catch (geminiError: any) {
        console.warn('Gemini ask fallback:', geminiError.message);
        const fallback = language === 'ar'
          ? 'نصيحة المدرب: سر الوصول للنغمات العالية براحة هو تقليل ضغط الهواء الزائد ورفع شراع الحنك الرخو (مثل بداية التثاؤب) مع إرخاء اللسان خلف الأسنان السفلية.'
          : 'Coach Tip: The key to effortless high notes is moderating breath pressure, lifting the soft palate gently (as in beginning a yawn), and keeping the tongue rested forward.';
        res.json({ reply: fallback });
      }
    } catch (err: any) {
      console.error('Server error in /api/coach/ask:', err);
      res.status(500).json({ error: err.message || 'Coach advice failed' });
    }
  });

  /**
   * POST /api/coach/workout
   * Generates a personalized step-by-step vocalise curriculum adapted to user's range.
   */
  app.post('/api/coach/workout', async (req, res) => {
    try {
      const {
        goal = 'general_warmup',
        voiceType = 'Tenor',
        lowestMidi = 48,
        highestMidi = 72,
        middleMidi = 60,
        language = 'en',
      } = req.body;

      // Returns a structured 5-step curriculum
      const steps = [
        {
          stepNumber: 1,
          category: 'posture_breath',
          titleEn: 'Diaphragmatic Breath & Rib Expansion',
          titleAr: 'التنفس الحجابي وتوسيع القفص الصدري',
          instructionEn: 'Stand tall with relaxed shoulders. Inhale deeply expanding your lower ribs for 4 seconds, then sustain a steady "Sssss" hiss for 8 seconds.',
          instructionAr: 'قف باستقامة مع استرخاء الكتفين. تنفس بعمق ووسع أضلاعك السفلية لـ 4 ثوانٍ، ثم أطلق صوت الهمس "سسسس" بثبات لـ 8 ثوانٍ.',
          targetMidi: middleMidi,
          targetDurationSec: 12,
          vowelPrompt: 'Sssss (Hiss)',
          goalType: 'breath_timer',
        },
        {
          stepNumber: 2,
          category: 'semi_occluded',
          titleEn: 'Lip Trill Tone Centering',
          titleAr: 'تمركز النغمة بطنين الشفاه',
          instructionEn: 'Perform a relaxed lip trill (motorboat sound) on your middle comfortable pitch. Feel the forward buzz in your lips without throat squeeze.',
          instructionAr: 'قم بعمل طنين الشفاه (صوت المحرك المريح) على نغمة ارتكازك الوسطى. اشعر بالاهتزاز الأمامي في الشفتين دون ضغط على الحلق.',
          targetMidi: middleMidi,
          targetDurationSec: 5,
          vowelPrompt: 'Brrr (Lip Trill)',
          goalType: 'pitch_hold',
        },
        {
          stepNumber: 3,
          category: 'vowel_resonance',
          titleEn: 'Open Vowel "Ah" Sustained Pure Pitch',
          titleAr: 'تثبيت نغمة نقية بحرف "آه" المفتوح',
          instructionEn: 'Sing a warm, resonant "Ah" vowel targeting the pitch. Lock your pitch within the green target indicator for at least 3 seconds.',
          instructionAr: 'غنِّ حرف "آه" دافئاً ورناناً موجهاً للنغمة المطلوبة. ثبّت نغمتك داخل المؤشر الأخضر لـ 3 ثوانٍ على الأقل.',
          targetMidi: Math.min(highestMidi - 2, middleMidi + 2),
          targetDurationSec: 4,
          vowelPrompt: 'Ah [ɑː]',
          goalType: 'pitch_hold',
        },
        {
          stepNumber: 4,
          category: 'agility_arpeggio',
          titleEn: '3-Tone Triad Agility & Register Transition',
          titleAr: 'مرونة الثلاثي الصوتي والانتقال بين الطبقات',
          instructionEn: 'Sing the 3-tone arpeggio (Do-Mi-Sol-Mi-Do). Focus on light, crisp vocal tract resonance and smooth octave navigation.',
          instructionAr: 'غنِّ التدرج الثلاثي (دو - مي - صول - مي - دو). ركّز على خفة ونقاء النبرة والانتقال السلس بين النغمات.',
          targetMidi: Math.min(highestMidi, middleMidi + 4),
          targetDurationSec: 6,
          vowelPrompt: 'Yah-Yah-Yah',
          goalType: 'agility',
        },
        {
          stepNumber: 5,
          category: 'range_challenge',
          titleEn: 'Upper Register Expansion & Head Voice Release',
          titleAr: 'توسيع الطبقة العالية وإطلاق الصوت الرأسي',
          instructionEn: 'Glide gently up towards your upper range using an "Oo" or "Ee" vowel. Keep sound light and floaty like a siren.',
          instructionAr: 'تدرج بنعومة نحو نغماتك العالية باستخدام حرف "أوو" أو "إيي". اجعل الصوت خفيفاً وطافياً كصفارة مريحة.',
          targetMidi: Math.min(highestMidi, middleMidi + 7),
          targetDurationSec: 5,
          vowelPrompt: 'Oooo [uː]',
          goalType: 'pitch_hold',
        },
      ];

      res.json({ steps });
    } catch (err: any) {
      console.error('Server error in /api/coach/workout:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Production vs Development handler
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VocalMaster Pro server listening on port ${PORT}`);
  });
}

startServer();
