def start_message(exam):
    return {"type":"button","body":{"text":f"📚 {exam.title}\n\nعدد الأسئلة: {exam.number_of_questions}\nالوقت: {exam.duration_seconds//60} دقيقة\n\nهل أنت مستعد؟"},"action":{"buttons":[{"type":"reply","reply":{"id":f"start:{exam.id}","title":"بدء الامتحان"}}]}}

def question_message(exam,attempt,question,options,position,total):
    # Meta reply buttons are limited; for 4+ options use a list message.
    rows=[{"id":f"answer:{attempt.id}:{question.id}:{o.id}","title":o.option_text[:24],"description":o.option_text[:72]} for o in options]
    if len(rows)<=3:
        return {"type":"button","body":{"text":f"📚 {exam.title}\n\nالسؤال {position} من {total}\n\n{question.question_text}"},"action":{"buttons":[{"type":"reply","reply":{"id":r["id"],"title":r["title"]}} for r in rows]}}
    return {"type":"list","body":{"text":f"📚 {exam.title}\n\nالسؤال {position} من {total}\n\n{question.question_text}"},"action":{"button":"اختر الإجابة","sections":[{"title":"الاختيارات","rows":rows}]}}

def feedback_message(correct,selected,correct_text):
    return f"{'✅ إجابة صحيحة!' if correct else '❌ إجابة خاطئة!'}\n\nإجابتك: {selected}\nالإجابة الصحيحة: {correct_text}"

def result_message(exam,a):
    m,s=divmod(a.completion_seconds or 0,60); h,m=divmod(m,60)
    time=(f"{h} ساعة و" if h else "") + f"{m} دقيقة و{s} ثانية"
    return f"🏆 نتيجتك النهائية\n\nالامتحان: {exam.title}\n\nالدرجة: {a.score} / {a.total_questions}\nالنسبة: {a.percentage}%\n\n✅ صحيح: {a.correct_answers}\n❌ خطأ: {a.wrong_answers}\n\n⏱️ الوقت: {time}\n\n🏅 الترتيب: {a.final_rank or '-'}"
