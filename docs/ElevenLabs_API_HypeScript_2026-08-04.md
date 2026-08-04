# מפרט שילוב ElevenLabs API בפרויקט HypeScript

עודכן ואומת מול התיעוד הרשמי: 4.8.2026 - כ"א באב תשפ"ו

מטרת המסמך: לתת לאייג'נט שמפתח את HypeScript מפרט מעשי, מאובטח ומדויק לשילוב תמלול, קריינות ושירותי אודיו נוספים של ElevenLabs.

## החלטה מרכזית

אין לתת למפתח API אחד הרשאות לכל החשבון.

לגרסה הנוכחית של HypeScript צריך בעיקר:

- Speech to Text - תמלול סרטוני וידאו ואודיו באמצעות `scribe_v2`.
- Text to Speech - קריינות באמצעות `eleven_v3` ומודלים נוספים.
- Voices Read - הצגת הקולות הזמינים ובחירת `voice_id`.
- Models Access - טעינת רשימת המודלים והיכולות שלהם בזמן אמת.
- Audio Isolation - ניקוי רעשי רקע לפני תמלול, כאפשרות נוספת.
- Pronunciation Dictionaries Read - שימוש במילון הגייה קיים לקריינות.

כל הרשאות הניהול, המשתמשים, סביבת העבודה ומפתחות השירות צריכות להישאר חסומות במפתח הריצה של האפליקציה.

---

# הגדרת המפתח המומלצת עכשיו

שם המפתח:

```text
hypescript-runtime
```

הגדרות:

- `Restrict Key`: מופעל.
- `Usage Limits`: לא לבחור Unlimited.
- להתחיל במגבלה של כ-5,000 credits לכל תקופת רענון, לבדוק שימוש בפועל, ורק אז להעלות.
- `Auto-disable if leaked`: להשאיר מופעל תמיד.
- `Restrict by IP`: להפעיל רק אם לשרת יש כתובת IP ציבורית יוצאת וקבועה. אחרת הבקשות ייחסמו.
- בזמן פיתוח: תפוגה של 30 יום.
- בפרודקשן: אפשר להשתמש ב-Never רק עם הרשאות מינימליות, מגבלת שימוש, שמירת Secret בצד השרת ורוטציה יזומה.

## הרשאות שיש לסמן כעת

```text
Text to Speech: Access
Speech to Text: Access
Audio Isolation: Access
Voices: Read
Models: Access
Pronunciation Dictionaries: Read
User: Access
```

`User: Access` אינו הכרחי ליצירת אודיו, אבל שימושי אם האפליקציה צריכה להציג פרטי חשבון, תוכנית או מכסה.

## הרשאות אופציונליות

להפעיל רק כאשר הפיצ'ר באמת קיים במוצר:

```text
Sound Effects: Access
Music Generation: Access
Speech to Speech: Access
Voice Generation: Access
Forced Alignment: Access
History: Read
Dubbing: Read / Write
Projects: Read / Write
Pronunciation Dictionaries: Write
Voices: Write
```

## הרשאות שחייבות להישאר חסומות במפתח הריצה

```text
ElevenAgents: No Access
Audio Native: No Access
Ads Engine: No Access
Administration - History Write: No Access
Workspace: No Access
Workspace Analytics: No Access
Webhooks: No Access
Service Accounts: No Access
Group Members: No Access
Workspace Members Read: No Access
Workspace Members Invite: No Access
Workspace Members Remove: No Access
Terms of Service Accept: No Access
```

לניהול Webhooks, אנליטיקה, מילוני הגייה או קולות עדיף ליצור מפתח נפרד בשם:

```text
hypescript-admin
```

המפתח הזה לא צריך להיות בשימוש שוטף באפליקציה ולא להיחשף לקוד הלקוח.

---

# כל קבוצות ההרשאות ומה הן עושות

## Text to Speech

יוצר קובץ אודיו מטקסט.

Endpoint עיקרי:

```http
POST /v1/text-to-speech/{voice_id}
```

שימושים ב-HypeScript:

- יצירת קריינות בעברית.
- יצירת קריינות בסגנון רגשי באמצעות Eleven v3.
- יצירת אודיו זורם בזמן אמת.
- יצירת אודיו יחד עם מידע תזמון.
- שמירה כ-MP3, WAV, PCM, Opus ופורמטים נוספים, לפי התוכנית וה-endpoint.

מודלים מרכזיים:

- `eleven_v3` - המודל הרגשי והאקספרסיבי ביותר. תומך בתגיות כמו `[whispers]`, `[laughs]`, `[sighs]`, `[angry]`.
- `eleven_multilingual_v2` - יציב יותר לקריינות ארוכה.
- `eleven_flash_v2_5` - מהיר וזול יותר, מתאים לחוויות אינטראקטיביות.

אין לקבע מגבלת תווים בקוד. יש לטעון אותה מ-`GET /v1/models`, משום שהמגבלות עשויות להשתנות לפי מודל ותוכנית.

דוגמת גוף בקשה:

```json
{
  "text": "שלום, זוהי קריינות שנוצרה בתוך HypeScript.",
  "model_id": "eleven_v3",
  "language_code": "he",
  "voice_settings": {
    "stability": 0.45,
    "similarity_boost": 0.8,
    "style": 0.35,
    "use_speaker_boost": true
  }
}
```

הערות חשובות:

- `eleven_v3` אינו דטרמיניסטי לחלוטין. אותה בקשה עשויה לתת ביצוע מעט שונה.
- אפשר להעביר `seed`, אך ElevenLabs מגדירה זאת כ-best effort בלבד.
- בפיצול טקסט ארוך יש להשתמש ב-`previous_text`, `next_text` או request IDs כדי לשמור על רציפות.
- אין לחשוף את המפתח בדפדפן.

## Speech to Text

מתמלל קובצי אודיו או וידאו.

Endpoint:

```http
POST /v1/speech-to-text
```

המודל המומלץ:

```text
scribe_v2
```

יכולות חשובות:

- עברית ויותר מ-90 שפות.
- חותמות זמן ברמת מילה או תו.
- הפרדת דוברים עד 32 דוברים.
- זיהוי אירועי שמע כמו צחוק, מוזיקה, מחיאות כפיים וצעדים.
- זיהוי שפה אוטומטי.
- Keyterm prompting לעד 1,000 מונחים.
- תמלול רב-ערוצי עד 5 ערוצים.
- תמלול אסינכרוני באמצעות Webhook.
- זיהוי וישום redaction לישויות רגישות.
- זיהוי דוברים מוכרים מתוך Speaker Library.
- תמלול בזמן אמת באמצעות WebSocket.

הגדרות מומלצות ל-HypeScript:

```text
model_id=scribe_v2
language_code=he
tag_audio_events=true
diarize=true
timestamps_granularity=word
no_verbatim=false
```

כאשר ידוע מספר הדוברים, להעביר `num_speakers`. זה עשוי לשפר הפרדה.

Keyterms מומלצים לסרטונים תורניים או ארגוניים:

```text
ישיבת הקדיש והחסד
לעילוי נשמת
תהא נשמתו צרורה בצרור החיים
שמות אנשים
שמות מקומות
מונחים תורניים
```

נקודות קריטיות:

- `no_verbatim=true` מסיר מילות מילוי, התחלות שווא וצלילים שאינם דיבור. אין להפעיל אותו כאשר רוצים לשמור `[laughter]`, נשימות או אירועי שמע.
- Keyterm prompting מוסיף 20% למחיר הבסיס.
- Entity detection או redaction מוסיפים 30% למחיר הבסיס.
- זיהוי תפקידי דוברים מוסיף 10%.
- בתמלול multi-channel כל ערוץ מחויב לפי מלוא משך הקובץ.
- קובץ יכול להיות עד 5GB.
- אפשר לשלוח קובץ או `source_url` מאובטח.
- יש לשמור את תגובת ה-JSON המקורית ולא רק TXT, משום שה-JSON כולל מילים, זמנים, סוג אירוע ו-speaker ID.

מבנה טיפוסי של מילה בתגובה:

```json
{
  "text": "שלום",
  "start": 0.42,
  "end": 0.91,
  "type": "word",
  "speaker_id": "speaker_0"
}
```

## Speech to Speech

Voice Changer.

Endpoint:

```http
POST /v1/speech-to-speech/{voice_id}
```

הוא משנה את זהות הקול תוך ניסיון לשמר תזמון, רגש וביצוע מהקלטת המקור.

להפעיל רק אם HypeScript כולל פיצ'ר של שינוי קול. אין צורך בו לתמלול או לקריינות מטקסט.

## Sound Effects

יוצר אפקט קולי מתיאור.

Endpoint:

```http
POST /v1/sound-generation
```

דוגמאות:

- whoosh למעבר.
- פגיעה קולנועית.
- קהל מוחא כפיים.
- אווירת חדר.
- מתח, רוח, צעדים או פעמון.

מתאים לעורך וידאו, אך יש לשים את הפיצ'ר מאחורי פעולה מפורשת של המשתמש כדי למנוע צריכת מכסה לא מכוונת.

## Audio Isolation

מנקה רעשי רקע ומבודד דיבור.

Endpoint:

```http
POST /v1/audio-isolation
```

Pipeline מומלץ:

```text
וידאו רועש
-> חילוץ/שליחת האודיו ל-Audio Isolation
-> תמלול האודיו הנקי עם Scribe v2
-> שמירת התמלול והזמנים
```

אין להפעיל אוטומטית על כל קובץ. ניקוי אגרסיבי על הקלטה שכבר נקייה עלול לפגוע בקול. מומלץ לאפשר למשתמש לבחור או להפעיל לאחר מדידת רעש.

## Music Generation

יוצר מוזיקה, שירים או מוזיקת רקע.

Endpoints מרכזיים:

```http
POST /v1/music
POST /v1/music/stream
POST /v1/music/create-composition-plan
POST /v1/music/video-to-music
POST /v1/music/upload
POST /v1/music/stem-separation
```

יכולות:

- יצירת מוזיקה מ-prompt.
- יצירת composition plan מפורט.
- מוזיקה המותאמת אוטומטית לסרטון.
- העלאת מוזיקה לעריכה או inpainting.
- הפרדת stems, כולל אפשרות לשני stems או שישה stems.
- יצירה באמצעות `music_v1` או `music_v2`.

העלאת מוזיקה נבדקת גם להפרות זכויות יוצרים. אין לבנות workflow שמניח שכל קובץ מוזיקה ניתן לעיבוד.

## Dubbing

דיבוב אודיו או וידאו לשפה אחרת.

Endpoint בסיסי:

```http
POST /v1/dubbing
```

יכולות:

- זיהוי אוטומטי של שפת המקור.
- בחירת שפת יעד.
- זיהוי מספר הדוברים.
- ניסיון לשמר את קול הדובר.
- החזרת job ID ובדיקת סטטוס.
- הורדת האודיו או הווידאו המדובב.
- מצב Dubbing Studio לעריכה.

הרשאות:

- `Read` - צפייה, קבלת סטטוס והורדת תוצרים קיימים.
- `Write` - יצירת דיבובים, שינוי ומחיקה.

אין צורך להפעיל ב-HypeScript עד שמיישמים מסך דיבוב אמיתי.

## ElevenAgents

פלטפורמה לבניית סוכני קול ושיחה.

כוללת:

- Agents.
- שיחות.
- Knowledge Base.
- כלי פעולה.
- מספרי טלפון.
- בדיקות וניתוח שיחות.
- Webhooks לאחר שיחה.

לא קשור ישירות לאייג'נט הקוד שמפתח את HypeScript. הרשאה זו מיועדת למוצר ElevenAgents עצמו. להשאיר חסום אלא אם HypeScript יהפוך למערכת שיחות קוליות בזמן אמת.

## Projects

מדובר ב-ElevenLabs Studio Projects, לא בפרויקטים הפנימיים של HypeScript.

יכולות:

- יצירת פרויקט ארוך מטקסט, מסמך או URL.
- חלוקה לפרקים.
- קולות שונים.
- המרה ויצוא של ספרים, מאמרים ותוכן ארוך.
- snapshots וארכיונים.

הרשאות:

- `Read` - הצגת פרויקטים, פרקים ותוצרים.
- `Write` - יצירה, עריכה, המרה ומחיקה.

לא נדרש לקריינות קצרה רגילה.

## Audio Native

יוצר נגן אודיו מוטמע למאמרים ואתרים.

יכולות:

- יצירת פרויקט ממאמר.
- הפקת HTML snippet להטמעה.
- עדכון תוכן מ-URL.
- ניהול הגדרות הנגן.

לא נדרש לעורך הווידאו.

## Voices

ניהול וגישה לקולות.

Endpoint להצגת קולות:

```http
GET /v2/voices
```

התגובה כוללת בין השאר:

- `voice_id`
- שם.
- תיאור.
- קטגוריה.
- labels.
- preview URL.
- סוג קול.
- הרשאות.
- סטטוס אימות.

סוגי קולות מרכזיים:

- `premade`
- `cloned`
- `generated`
- `professional`

הרשאות:

- `Read` - הצגה, חיפוש ובחירת קול.
- `Write` - שינוי, הוספה, מחיקה וניהול קולות.

ל-HypeScript ברירת המחדל היא `Read`. אין לתת `Write` אלא אם המוצר מאפשר למשתמש ליצור או למחוק קולות.

הערה: Voice Library המלאה אינה זמינה דרך API בחשבון Free. קולות שכבר נמצאים בספרייה האישית עדיין ניתנים להפניה לפי `voice_id`, בהתאם לתוכנית ולרישוי.

## Voice Generation

Voice Design - יצירת קול חדש מתיאור טקסטואלי.

מתאים לפיצ'ר שבו המשתמש מתאר קול, מקבל previews ובוחר קול חדש.

אינו נדרש כדי להשתמש בקול קיים.

## Forced Alignment

מקבל אודיו ותמליל ידוע ומחזיר התאמה מדויקת של הטקסט לזמן.

Endpoint:

```http
POST /v1/forced-alignment
```

שימושים:

- סנכרון כתוביות לתמליל מתוקן.
- התאמת ספר מוקלט לטקסט.
- חותמות זמן לתווים ולמילים.

מגבלות חשובות:

- התיעוד הרשמי הנוכחי אינו מציג עברית ברשימת השפות הנתמכות של Forced Alignment.
- לכן אסור לבנות עליו כפתרון הראשי לסנכרון עברית.
- בעברית יש להשתמש קודם כל ב-word timestamps שמחזיר Scribe v2.
- אין תמיכה ב-diarization ב-Forced Alignment.
- גודל מרבי מתועד: 3GB.
- משך מרבי מתועד: 10 שעות.
- התמחור זהה ל-Speech to Text.

## Ads Engine

כלי לוקליזציה וניהול מודעות מול Google, Meta ו-LinkedIn.

נכון ל-4.8.2026 - כ"א באב תשפ"ו:

- נמצא ב-alpha.
- אינו זמין דרך API.
- לכן אין לתת לו הרשאה בפרויקט HypeScript.
- עצם הופעתו במסך ההרשאות אינה אומרת שיש endpoint ציבורי לשילוב רגיל.

## History

גישה להיסטוריית יצירות האודיו.

Endpoints:

```http
GET /v1/history
GET /v1/history/{history_item_id}
GET /v1/history/{history_item_id}/audio
POST /v1/history/download
DELETE /v1/history/{history_item_id}
```

היסטוריה כוללת TTS, Voice Changer, Studio ודיבוב. Music ו-Sound Effects אינם נכללים כרגע ב-history API הזה.

הרשאות:

- `Read` - הצגה והורדה.
- `Write` - מחיקה ופעולות משנות.

אם HypeScript שומר את התוצרים ב-storage שלו, אפשר להשאיר No Access. אם רוצים מסך שחזור יצירות ElevenLabs, לתת Read בלבד.

## Models

Endpoint:

```http
GET /v1/models
```

מחזיר:

- model ID.
- שם ותיאור.
- תמיכה ב-TTS.
- תמיכה ב-voice conversion.
- שפות.
- מגבלות תווים.
- יכולות style ו-speaker boost.
- תעריפים או multipliers זמינים.

זו הרשאה בטוחה ושימושית. מומלץ לתת Access ולא לקבע מודלים ומגבלות בקוד בלי fallback.

## Pronunciation Dictionaries

מילוני הגייה בפורמט PLS או כללים שנוצרים דרך API.

שימושים:

- שמות פרטיים בעברית.
- שמות ישיבות וארגונים.
- ראשי תיבות.
- מונחים תורניים.
- מילים באנגלית בתוך משפט עברי.

הרשאות:

- `Read` - טעינת מילון קיים ושימוש ב-ID וב-version ID.
- `Write` - יצירה, עדכון, הוספת כללים ומחיקה.

בבקשת TTS אפשר לצרף עד שלושה dictionary locators.

Phoneme dictionaries נתמכים ב-`eleven_v3` וב-`eleven_flash_v2`. עבור עברית יש לבדוק כל כלל על הקול הספציפי, משום שהמבטא מושפע גם מהקול עצמו.

## User

גישה לפרטי המשתמש והמנוי.

שימוש אפשרי:

- הצגת תוכנית.
- מכסה.
- סטטוס מנוי.
- מידע בסיסי לצורכי diagnostics.

לא נדרש ליצירת אודיו. לתת Access רק אם האפליקציה משתמשת במידע הזה.

## Workspace ו-Workspace Analytics

הרשאות ניהול וניתוח של סביבת עבודה.

כוללות הגדרות, שימוש, analytics, audit ונתונים ארגוניים.

לא לתת למפתח runtime. אם צריך dashboard ניהולי, ליצור מפתח admin נפרד.

## Webhooks

ניהול callbacks של ElevenLabs.

הרשאת Webhooks מאפשרת ליצור, לעדכן ולמחוק webhook ברמת workspace. היא אינה נחוצה בכל בקשת תמלול רגילה.

עבור תמלול אסינכרוני:

- להגדיר webhook פעם אחת באמצעות dashboard או מפתח admin.
- לאפשר ל-runtime רק Speech to Text.
- לאמת חתימה/HMAC בצד השרת.
- לשייך job פנימי באמצעות `webhook_metadata`.
- לטפל ב-retries ובכפילויות באופן idempotent.

## Service Accounts, Groups ו-Workspace Members

הרשאות אדמיניסטרציה:

- יצירת וניהול service accounts.
- יצירת API keys נוספים.
- ניהול קבוצות.
- קריאת חברי workspace.
- הזמנה או הסרה של חברים.

אלה ההרשאות המסוכנות ביותר ברשימה ואסור לתת אותן למפתח של אפליקציה.

## Terms of Service Accept

מאפשר קבלת תנאים בשם החשבון דרך API.

אין שום סיבה לתת למפתח runtime הרשאה זו.

---

# ארכיטקטורת אבטחה מחייבת

## שמירת Secret

ב-Vercel או שרת אחר:

```text
ELEVENLABS_API_KEY=...
```

כללים:

- לא להשתמש בשם שמתחיל ב-`NEXT_PUBLIC_`.
- לא לשלוח את המפתח ל-React.
- לא להחזיר אותו ב-JSON.
- לא לכתוב אותו ללוגים.
- לא להכניס אותו ל-Git.
- כל הקריאות ל-ElevenLabs יעברו דרך backend route או server action.
- יש לבדוק גודל וסוג קובץ לפני העלאה.
- יש rate limiting לפי משתמש.
- יש לרשום usage פנימי לפי user/job.
- יש לשמור request IDs לצורך debug.
- במקרה של דליפה: לבטל את המפתח, ליצור חדש ולעדכן את Secret.

## הפרדת מפתחות

מומלץ:

```text
hypescript-runtime
hypescript-admin
```

`hypescript-runtime`:

- תמלול.
- קריינות.
- קריאת קולות ומודלים.
- Audio Isolation.
- מגבלת שימוש נמוכה יחסית.

`hypescript-admin`:

- יצירת Webhooks.
- ניהול מילוני הגייה.
- ניהול קולות.
- Analytics.
- אינו משמש בקוד רגיל ואינו נגיש למשתמשי המוצר.

---

# Pipeline מומלץ לתמלול וידאו

```text
1. המשתמש מעלה וידאו.
2. השרת שומר את הקובץ זמנית או יוצר URL חתום.
3. המערכת בודקת רעש.
4. לפי הצורך מפעילה Audio Isolation.
5. שולחת ל-Scribe v2 עם language_code=he.
6. מפעילה diarization, audio event tags ו-word timestamps.
7. שומרת את תגובת ה-JSON המקורית.
8. מייצרת transcript פנימי.
9. מייצרת SRT/VTT מתוך חותמות הזמן.
10. מאפשרת תיקון ידני בלי למחוק את המיפוי למילים המקוריות.
11. כתיב ופיסוק יכולים לעבור post-processing, אך אין לשנות את timestamps ללא alignment חדש.
```

יש לשמור לכל token:

```text
text
start
end
type
speaker_id
confidence/logprob אם קיים
```

אירועים שאינם דיבור צריכים להישמר כאובייקטים, לא להיבלע בתוך טקסט חופשי.

---

# Pipeline מומלץ לקריינות

```text
1. טעינת קולות מ-GET /v2/voices.
2. הצגת preview, שם, labels וקטגוריה.
3. המשתמש בוחר voice_id.
4. המערכת בוחרת מודל:
   - eleven_v3 לאיכות ורגש.
   - multilingual_v2 לקריינות ארוכה ויציבה.
   - flash_v2_5 למהירות.
5. הוספת pronunciation dictionary לפי הצורך.
6. יצירת האודיו בצד השרת.
7. שמירת הקובץ ב-storage של HypeScript.
8. שמירת request_id, voice_id, model_id, הטקסט וההגדרות.
9. החזרת URL זמני או קובץ למשתמש.
```

אין להסתמך רק על History של ElevenLabs בתור בסיס הנתונים של הפרויקט.

---

# מחירים עיקריים דרך API

המחירים להלן אומתו ב-4.8.2026 - כ"א באב תשפ"ו, לפני מסים:

- Text to Speech עם Multilingual v2 או Eleven v3: `$0.10` לכל 1,000 תווים.
- Flash/Turbo: `$0.05` לכל 1,000 תווים.
- Scribe v2: `$0.22` לשעת אודיו.
- Scribe v2 Realtime: `$0.39` לשעה.
- Keyterm prompting: תוספת של `$0.05` לשעה, כלומר 20% על מחיר Scribe הבסיסי.
- Entity detection: תוספת של `$0.07` לשעה.
- Voice Changer: `$0.12` לדקה.
- Voice Isolator: `$0.12` לדקה.
- Sound Effects: `$0.12` לדקת תוצר.
- Music: `$0.15` לדקה.
- Dubbing אוטומטי עם watermark: `$0.33` לדקת מקור.
- Dubbing ללא watermark או Dubbing Studio: `$0.50` לדקת מקור.

דוגמה:

```text
סרטון של 4 דקות ב-Scribe v2:
$0.22 × 4 / 60 = כ-$0.0147

עם Keyterm prompting:
כ-$0.018
```

20 מילים בעברית הן לרוב כ-100 עד 140 תווים:

```text
Eleven v3:
כ-$0.010 עד $0.014 ליצירה אחת
```

יש לזכור שכל ניסיון regeneration מחויב מחדש.

---

# שגיאות שצריך לטפל בהן

האייג'נט חייב לטפל לפחות ב:

```text
401 - מפתח חסר, שגוי או שפג תוקפו
403 - הרשאה חסרה או IP שאינו מורשה
413 - קובץ גדול מדי
422 - פרמטרים או פורמט לא תקינים
429 - rate limit או quota
5xx - תקלה זמנית ב-ElevenLabs
timeout - קובץ ארוך או שירות איטי
```

מדיניות retry:

- לא לבצע retry אוטומטי על 401, 403 או 422.
- לבצע exponential backoff על 429 ו-5xx.
- לפני retry של יצירה בתשלום, לבדוק אם התקבלה תשובה או request ID כדי לא ליצור חיוב כפול.
- פעולות אסינכרוניות חייבות להיות idempotent.

---

# קישורים רשמיים

- API Keys: https://elevenlabs.io/app/developers/api-keys
- API Reference: https://elevenlabs.io/docs/api-reference
- Authentication: https://elevenlabs.io/docs/api-reference/authentication
- API Pricing: https://elevenlabs.io/pricing/api
- Speech to Text: https://elevenlabs.io/docs/api-reference/speech-to-text/convert
- Text to Speech: https://elevenlabs.io/docs/api-reference/text-to-speech/convert
- Voices: https://elevenlabs.io/docs/api-reference/voices/search
- Models: https://elevenlabs.io/docs/api-reference/models/list
- Forced Alignment: https://elevenlabs.io/docs/overview/capabilities/forced-alignment
- Pronunciation Dictionaries: https://elevenlabs.io/docs/eleven-api/guides/how-to/text-to-speech/pronunciation-dictionaries
- Webhooks: https://elevenlabs.io/docs/eleven-api/resources/webhooks

---

# הוראת יישום לאייג'נט

יש ליישם תחילה רק את ארבעת המודולים הבאים:

```text
1. Speech to Text עם Scribe v2.
2. Text to Speech עם Eleven v3.
3. GET /v2/voices.
4. GET /v1/models.
```

לאחר שהם עובדים מקצה לקצה, להוסיף:

```text
5. Audio Isolation.
6. Pronunciation Dictionaries.
7. Sound Effects או Music לפי צורך מוצר אמיתי.
```

אין להוסיף Dubbing, ElevenAgents, Studio Projects, Audio Native, Ads Engine או הרשאות Administration לפני שקיים מסך מוצר ו-use case מוגדר עבורם.
