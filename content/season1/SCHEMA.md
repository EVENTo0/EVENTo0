# مواصفات تسليم الحلقة

لكل حلقة `NN` (01–10) ملفان في `content/season1/episodes/`:

## 1) `epNN.screenplay.md` — السيناريو الكامل
- عنوان الحلقة ولوغلاين بالعربية.
- 6 إلى 9 مشاهد فرعية مرقّمة `EPNN-01` …، كل مشهد: سطر ترويسة (داخلي/خارجي · المكان · الوقت · السنة)، وصف حركي مقتضب، ثم **حوار كامل** بالخليجية.
- طول الحلقة المقصود 25–30 دقيقة (حوالي 4500–6000 كلمة عربية).
- الحلقة **تنتهي أو تبلغ ذروتها** عند المشهد الأصلي المرتكز بحواره الأصلي حرفياً (انظر `BIBLE.md`).
- لا تناقض الدستور ولا الحلقات الأخرى (الأعمار، التواريخ، أسماء الشخصيات).

## 2) `epNN.shots.json` — قائمة اللقطات والـPrompts
```json
{
  "episode": 1,
  "title_ar": "يد أبي",
  "title_en": "My Father's Hand",
  "logline_ar": "…",
  "anchor": "S01",
  "runtime_min": 27,
  "subscenes": [
    {
      "id": "E01-01",
      "year": 2019,
      "location": "…",
      "time_of_day": "…",
      "cast": ["youssef", "hamad"],
      "dur_sec": 90,
      "setting": "bedside_dawn",
      "camera": "Slow push-in",
      "beat_ar": "ما يحدث في المشهد بجملة أو اثنتين",
      "caption_ar": "أهم سطر حوار في المشهد (للمعاينة)",
      "shots": [
        {
          "id": "E01-01-A",
          "dur_sec": 8,
          "camera": "Slow push-in",
          "midjourney": "… --ar 21:9 --style raw --v 7",
          "runway": "…",
          "sound": "ElevenLabs: … Suno: …"
        }
      ]
    }
  ]
}
```
- `cast` قيم مسموحة: `youssef` `hamad` `noura` `salem` `mariam` `khalid` `faisal`.
- `setting` (لتحريك المعاينة) واحد من: `bedside_dawn` `bedside_night` `desert_dawn` `majlis` `kitchen` `night_room` `clinic` `car` `desert_lone`.
- كل مشهد فرعي 2 إلى 4 لقطات. مجموع `dur_sec` للمشاهد الفرعية = زمن الحلقة الفعلي على الشاشة (للحلقة ≈ 1500–1800 ثانية).
- **midjourney:** إنجليزي فقط، 70–100 كلمة، ينتهي بالضبط بـ `--ar 21:9 --style raw --v 7`، ويحوي وصف الشخصيات **حرفياً** من `node scripts/cast.mjs`.
- **runway:** إنجليزي، 45–70 كلمة، لقطة واحدة متصلة، يذكر مدة بالثواني وحركة كاميرا صريحة.
- **sound:** `ElevenLabs: <توجيه صوتي بالعربية ~10 كلمات>. Suno: <mood موسيقي بالإنجليزية ~8 كلمات>`.

## الفحص الآلي (شغّله قبل التسليم)
`node scripts/check-episode.mjs NN` — يجب أن ينتهي بـ `OK` بلا أخطاء.
