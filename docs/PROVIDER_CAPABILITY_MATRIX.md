# PROVIDER_CAPABILITY_MATRIX

> מצב אמיתי של ספקים. "מוכן" כרגע אומר שמפתח נדרש קיים לפי `/api/config`; זה **לא**
> health-check מול הספק. לעולם לא להציג "מחובר" בלי בדיקה אמיתית.
> אין עדיין Zero-cost policy מלא: user-billed/unknown אינם נחסמים בשכבת Policy מרכזית.

## ארכיטקטורה נוכחית (אמת)
- קיים Provider Registry בסיסי וכנה (`web/lib/providers/`):
  - `ProviderDefinition` סטטי לספקים שמחוברים בפועל בלבד.
  - `getProviderStatuses` ממפה תשובת `/api/config` ל-`ready` / `missing_key` / `unavailable`.
  - אין עדיין `ProviderConnection`, בדיקת upstream, `ExecutionPolicy` או ניהול עלויות מרכזי.
- קיים בנוסף:
  - **LLM proxy** צד-שרת (`lib/agent/providers.ts`): DeepSeek, OpenAI, Anthropic, Gemini — מפתחות מ-env בלבד, לא מגיעים לדפדפן. `/api/config` מדווח אילו מוגדרים.
  - **תמלול**: Groq Whisper דרך `/api/transcribe` (proxy). מפתח מ-env קודם; קיים fallback ממפתח לקוח (ראה SECURITY_MODEL — פער ידוע לתיקון בחבילת ספקים).
  - **רינדור**: `RenderBackend` (ffmpeg.wasm בדפדפן; native נבדק בבדיקות integration).
- כל השאר (image/video/voice/music/storage/search/fonts) — **לא ממומש**. חייב Registry לפני חשיפה.

## LLM (Agent)
| ספק | mode | word-align | streaming | tools | סטטוס | עלות | הערות |
|---|---|---|---|---|---|---|---|
| DeepSeek | cloud | n/a | ✖ | ✔ | Registry + env-key | user-billed | ברירת-מחדל; לשמר `reasoning_content` (חבילת Agent) |
| OpenAI | cloud | n/a | ✖ | ✔ | Registry + env-key | user-billed | תומך ראייה |
| Anthropic | cloud | n/a | ✖ | ✔ | Registry + env-key | user-billed | תומך ראייה |
| Gemini | cloud | n/a | ✖ | ✔ | Registry + env-key | free-tier/unknown | תומך ראייה |
| Ollama/LM Studio/LocalAI/OpenRouter/... | local/cloud | — | — | — | **חסר** | — | דרך Registry |

**אל תקבע model קשיח** — נדרש `listModels` דינמי (עתידי). כרגע model ברירת-מחדל מ-env (`*_MODEL`).

## תמלול
| ספק | word ts | segment ts | diarization | עברית | סטטוס | עלות |
|---|---|---|---|---|---|---|
| ElevenLabs Scribe (`scribe_v2`) | ✔ | ✔ | ✔ | ✔ | Registry + `/api/transcribe` + כלי סוכן | user-billed |
| Groq Whisper | ✔ | ✔ | ✖ | ✔ | Registry + proxy | user-billed |
| faster-whisper / WhisperX (local) | ✔ | ✔ | ✔(WhisperX) | ✔ | local CLI | free-local |
| Gemini (audio understanding) | ✖(לא לתזמון-מילה) | ✖ | — | ✔ | **חסר** | free-tier |
| OpenAI/Google STT/Azure/Deepgram/AssemblyAI/REST | משתנה | משתנה | משתנה | משתנה | **חסר** | — |

**החלטה ארכיטקטונית:** שכבת תזמון = ElevenLabs Scribe / WhisperX/faster-whisper/Groq; שכבת QA סמנטית = Gemini/LLM. אין לתייג Gemini כ"יישור-מילה מדויק".
ברירת מחדל ב-web (auto): ElevenLabs אם `ELEVENLABS_API_KEY` קיים, אחרת Groq. מפרט: `docs/ElevenLabs_API_HypeScript_2026-08-04.md`.

## Image / Video / Voice / Music / Storage / Search / Fonts / Icons / Templates
| קטגוריה | ספקים מתוכננים | סטטוס |
|---|---|---|
| Image | GPT Image, Gemini Image, ComfyUI, SD/A1111, REST | **חסר** |
| Video | Veo, Sora, Seedance (רק API רשמי מתועד — אין scraping), ComfyUI, REST | **חסר** |
| Voice | ElevenLabs TTS (`eleven_v3` + voices/models) | ✔ Registry + `/api/elevenlabs/*` + כלי סוכן |
| Music/SFX | ספקי-REST/local | **חסר** |
| Storage | Local FS, Supabase Storage, R2, S3, Drive/Dropbox/OneDrive | **חסר** (כרגע OPFS/IndexedDB בלבד) |
| Media search | Pexels, Pixabay, Openverse (חובה לשמור license/attribution; אין hotlink קבוע) | **חסר** |
| Fonts/Icons/Templates | Google Fonts/Fontsource, Iconify (Lucide בשימוש), TemplatePackage | **חסר** |

## Missing-key policy
בהיעדר מפתח/ספק: Chat חוסם בחירת LLM לא מוגדר ומציג סיבה בעברית; `/api/transcribe`
מחזיר שגיאה אם אין מפתח. אין עדיין health-check upstream או אכיפת Zero-cost מרכזית.
הסוכן לא יטען שביצע פעולה שלא יכול לבצע.
