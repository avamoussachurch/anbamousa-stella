import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('teacher authoring, hymn and ritual publishing screens use Egyptian Arabic', async () => {
  const [hymns, taxis, lessonEdit, expressPublish] = await Promise.all([
    read('../src/components/teacher/publishing/HymnsPublishingStudio.tsx'),
    read('../src/components/teacher/publishing/TaxisPublishingStudio.tsx'),
    read('../src/components/teacher/LessonEditModal.tsx'),
    read('../src/components/teacher/ExpressLessonPublishModal.tsx'),
  ]);

  assert.match(hymns, /مش قادرين نحمّل مكتبة الألحان دلوقتي/);
  assert.match(hymns, /جهّز كلمات اللحن بالقبطي والمعرّب والعربي/);
  assert.match(taxis, /لازم العنصر يتراجع ويتعتمد الأول/);
  assert.match(taxis, /الطقس اتراجع واتعتمد، وبقى جاهز للنشر/);
  assert.match(lessonEdit, /إيه الفكرة الروحية الأساسية في الدرس؟/);
  assert.match(lessonEdit, /بنحمّل مسودة الإصدار اللي تقدر تعدّلها/);
  assert.match(expressPublish, /المساعد اقترح سؤالين زيادة/);
  assert.match(expressPublish, /النشر المباشر متاح للمسؤول بس/);
});

test('student roadmap, quizzes, and teacher review metrics use Egyptian Arabic', async () => {
  const [roadmap, quiz, review, engagement] = await Promise.all([
    read('../src/components/student/StudentRoadmapView.tsx'),
    read('../src/components/sunday-school/student/SundaySchoolQuizView.tsx'),
    read('../src/components/teacher/StudentLearningReviewView.tsx'),
    read('../src/components/teacher/LessonEngagementSummary.tsx'),
  ]);

  assert.match(roadmap, /أول محطات رحلتك هتظهر هنا أول ما تتنشر/);
  assert.match(roadmap, /يلا ابدأ المحطة/);
  assert.match(quiz, /جاوب على كل الأسئلة الأول/);
  assert.match(quiz, /إجابة صح! برافو عليك!/);
  assert.match(review, /مش قادرين نحمّل تقرير التلميذ/);
  assert.match(review, /النتيجة أقل من ٦٠٪/);
  assert.match(engagement, /ملخص تفاعل التلاميذ وفهمهم للدروس المنشورة/);
  assert.match(engagement, /دوّر على درس/);
});
