# PROVIDER_CAPABILITY_MATRIX

> מצב אמיתי של ספקים. "מחובר" נקבע רק אחרי health-check; לעולם לא להציג "מחובר" בלי בדיקה.
> Zero-cost mode פעיל כברירת מחדל: user-billed/unknown חסומים ללא אישור מפורש.

## ארכיטקטורה נוכחית (אמת)
- אין עדיין Provider Registry רשמי עם `ProviderDefinition`/`ProviderConnection`/`ExecutionPolicy`. קיים:
  - **LLM proxy** צד-שרת (`lib/agent/providers.ts`): DeepSeek, OpenAI, Anthropic, Gemini — מפתחות מ-env בלבד, לא מגיעים לדפדפן. `/api/config` מדווח אילו מוגדרים.
  - **תמלול**: Groq Whisper דרך `/api/transcribe` (proxy). מפתח מהדפדפן, לא נשמר בשרת (ראה SECURITY_MODEL — פער ידוע לתיקון בחבילת ספקים).
  - **רינדור**: `RenderBackend` (ffmpeg.wasm בדפדפן; native נבדק בבדיקות integration).
- כל השאר (image/video/voice/music/storage/search/fonts) — **לא ממומש**. חייב Registry לפני חשיפה.

## LLM (Agent)
| ספק | mode | word-align | streaming | tools | סטטוס | עלות | הערות |
|---|---|---|---|---|---|---|---|
| DeepSeek | cloud | n/a | ✖ | ✔ | env-key | user-billed | ברירת-מחדל; לשמר `reasoning_content` (חבילת Agent) |
| OpenAI | cloud | n/a | ✖ | ✔ | env-key | user-billed | תומך ראייה |
| Anthropic | cloud | n/a | ✖ | ✔ | env-key | user-billed | תומך ראייה |
| Gemini | cloud | n/a | ✖ | ✔ | env-key | free-tier/unknown | תומך ראייה |
| Ollama/LM Studio/LocalAI/OpenRouter/... | local/cloud | — | — | — | **חסר** | — | דרך Registry |

**אל תקבע model קשיח** — נדרש `listModels` דינמי (עתידי). כרגע model ברירת-מחדל מ-env (`*_MODEL`).

## תמלול
| ספק | word ts | segment ts | diarization | עברית | סטטוס | עלות |
|---|---|---|---|---|---|---|
| Groq Whisper | ✔ | ✔ | ✖ | ✔ | קיים(proxy) | user-billed |
| faster-whisper / WhisperX (local) | ✔ | ✔ | ✔(WhisperX) | ✔ | **חסר** | free-local |
| Gemini (audio understanding) | ✖(לא לתזמון-מילה) | ✖ | — | ✔ | **חסר** | free-tier |
| OpenAI/Google STT/Azure/Deepgram/AssemblyAI/REST | משתנה | משתנה | משתנה | משתנה | **חסר** | — |

**החלטה ארכיטקטונית:** שכבת תזמון = WhisperX/faster-whisper/Groq; שכבת QA סמנטית = Gemini/LLM. אין לתייג Gemini כ"יישור-מילה מדויק".

## Image / Video / Voice / Music / Storage / Search / Fonts / Icons / Templates
| קטגוריה | ספקים מתוכננים | סטטוס |
|---|---|---|
| Image | GPT Image, Gemini Image, ComfyUI, SD/A1111, REST | **חסר** |
| Video | Veo, Sora, Seedance (רק API רשמי מתועד — אין scraping), ComfyUI, REST | **חסר** |
| Voice | ElevenLabs (+ dictionaries לשמות/מונחים), OpenAI/Google/Azure, local | **חסר** |
| Music/SFX | ספקי-REST/local | **חסר** |
| Storage | Local FS, Supabase Storage, R2, S3, Drive/Dropbox/OneDrive | **חסר** (כרגע OPFS/IndexedDB בלבד) |
| Media search | Pexels, Pixabay, Openverse (חובה לשמור license/attribution; אין hotlink קבוע) | **חסר** |
| Fonts/Icons/Templates | Google Fonts/Fontsource, Iconify (Lucide בשימוש), TemplatePackage | **חסר** |

## Missing-key policy
בהיעדר מפתח/ספק: לעצור לפני upload, הודעה אנושית, הצעת חלופה (local/אחר), ואכיפת Zero-cost. הסוכן לא יטען שביצע פעולה שלא יכול לבצע.
