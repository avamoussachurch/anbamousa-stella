# Anba Mousa Localization Standard

## Product language decisions

- Arabic is the default for first-time visitors.
- Arabic copy is friendly, natural Egyptian Arabic (مصري بسيط وواضح), not formal Modern Standard Arabic.
- English remains a complete, first-class language option.
- The app shell is permanently anchored RTL so changing language never mirrors navigation, sidebars, maps, game-world placement, or the overall spatial composition.
- Language selection changes the words and language metadata, not the app's geometry. Language-aware text components may set their own text direction where necessary.
- The selected language remains saved in `church_app_lang`.

## Egyptian Arabic voice

Write as a warm, helpful Egyptian church community. Keep sentences short and conversational. Address children with encouragement and clarity; speak to parents and servants respectfully without sounding bureaucratic.

Preferred examples:
- "اكتب كلمة السر عشان تكمّل"
- "جرّب تاني"
- "مفيش حاجة هنا لسه."
- "ملقيناش نتائج مطابقة."
- "بنحمّل المحتوى..."

Avoid stiff constructions such as:
- "يرجى إدخال كلمة المرور للمتابعة"
- "لم يتم العثور على نتائج مطابقة"
- "جارٍ تحميل المحتوى"

## Church and educational terminology

- Preserve established Coptic Orthodox terms, hymn names, prayer names, Bible references, saint names, and liturgical season names.
- Do not colloquialize sacred texts, Scripture quotations, liturgical responses, hymn lyrics, or approved doctrinal content.
- Use Egyptian Arabic for interface instructions and conversational explanations; use accurate church terminology for ecclesiastical concepts.
- Never invent or paraphrase doctrinal claims while localizing UI copy.

## English

- Keep English complete and natural; do not leave Arabic-only controls or error states.
- Use the brand tagline exactly: "Growing in Faith, Learning in Love".
- Avoid changing layout positions when English is selected.

## Required localization coverage

Audit and localize every user-facing surface, not only the student home:
- Login, registration, password recovery, onboarding, and activation.
- Student home, map/world navigation, lessons, lesson reader, quizzes, results, streaks, points, rewards, profile, hymns, taxis, Agpeya, calendar, and community.
- Teacher dashboard, publishing, curriculum import, review, class management, reports, and settings.
- Parent dashboard, child profiles, progress, approvals, and notifications.
- Admin workspace, permissions, moderation, system settings, and audit views.
- Shared navigation, dialogs, tooltips, validation, loading, empty, success, warning, and error states.
- Emails, push notifications, generated lesson explanations, AI feedback, and server-originated messages where applicable.

## Implementation and QA rules

1. New user-facing copy must be added to the translation registry or an explicitly documented localized content source; avoid new hardcoded language ternaries.
2. Every translation entry must have complete Arabic and English values. No raw translation keys or accidental English fallback in Arabic mode.
3. Preserve the app shell's RTL geometry in both languages. Check navigation order, sidebars, game-world positions, icons, charts, forms, and responsive layouts.
4. For English text inside the RTL shell, set text direction at the content/component level when needed; do not mirror the whole app.
5. Test language persistence after refresh and after sign-in/out.
6. Test Arabic and English at phone and desktop widths, including long labels, validation messages, loading, empty, and error states.
7. Do not claim full Egyptian Arabic coverage until all role-based screens and dynamic/server-generated strings have been audited and reviewed by a fluent Egyptian Arabic speaker.

## Current rollout status

- [x] Arabic remains the first-visit default.
- [x] Language changes no longer change the root app direction; the app shell remains RTL.
- [x] Language metadata updates independently from layout direction.
- [x] Common feedback phrases use friendly Egyptian Arabic.
- [ ] Complete screen-by-screen hardcoded-string inventory.
- [ ] Full student, teacher, parent, and admin localization.
- [x] Ninth Egyptian Arabic pass across admin role/account/support operations and remaining teacher dashboard demo/offline/permission feedback.
- [x] Tenth localization pass: shared translation registry action copy uses Egyptian Arabic; missing Arabic/English translations now show readable localized notices instead of raw translation keys.
- [x] Sixth Egyptian Arabic pass across top navigation, mobile bottom navigation, workspace sidebar, splash screen, global hymn player, leaderboard podium, quiz victory celebration, Bible verse card label, and teacher lesson publication manager.
- [x] Eighth Egyptian Arabic pass across teacher attendance/visitation, Hymns School enrollment management, and manual lesson authoring.
- [x] Seventh Egyptian Arabic pass across Sunday School lesson resources, in-app document viewer, reward celebration, family altar controls, student church calendar, and parent/servant/admin profile forms.
- [x] Fifth Egyptian Arabic pass across Agpeya prayer tracking interface, Coptic calendar navigation/countdowns, and parent/servant account profiles.
- [x] Fourth Egyptian Arabic pass across student onboarding, parent QR scanning, child QR modal, parent learning journey, church events, student feature links, and student-facing FAQ.
- [x] Third Egyptian Arabic pass across teacher Hymns/Taxis publishing studios, lesson authoring and express publishing, teacher learning review/engagement analytics, student roadmap, and Sunday School quizzes.
- [x] Second Egyptian Arabic pass across student profile, parent settings, child progress, weekly progress, secure child linking, teacher class management, source library, publishing hub, and curriculum import.
- [x] First Egyptian Arabic copy pass across login/registration, student adventure home, lessons and lesson reading, points/rewards, community feed, teacher home, parent home, parent dashboard, admin workspace, Hymns, and Taxis screens.
- [x] Localize administrative role names in Arabic instead of leaking raw English role identifiers.
- [x] Correct the localization QA dashboard so registry completeness is not presented as whole-app translation coverage.
- [ ] Continue screen-by-screen copy review for remaining student, teacher, parent, and admin sub-screens.
- [ ] Dynamic AI/server messages localization audit.
- [ ] Legal/privacy policy plain-language review; preserve legal precision and do not colloquialize policy text without approval.
- [ ] Full RTL-shell visual QA in Arabic and English on mobile and desktop.
- [ ] Native Egyptian Arabic review.
