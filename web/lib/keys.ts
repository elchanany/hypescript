// שמות מפתחות ה-localStorage (משותף לעורך ולהגדרות).
// הערה: מפתחות ה-API עצמם נשמרים במשתני הסביבה של Vercel, לא כאן.
// כאן נשמרות רק העדפות לא-סודיות (בחירת ספק ה-AI / תמלול).
export const GROQ_KEY = "hypescript_groq_key";
export const OPENAI_KEY = "hypescript_openai_key";
export const PROVIDER_PREF = "hypescript_provider";
/** העדפת ספק תמלול: auto | elevenlabs | groq */
export const TRANSCRIBE_PREF = "hypescript_transcribe_provider";
/** מודל תמלול ספציפי (למשל scribe_v2 / whisper-large-v3); ריק = ברירת מחדל לספק */
export const TRANSCRIBE_MODEL_PREF = "hypescript_transcribe_model";
