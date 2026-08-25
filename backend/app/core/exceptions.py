class ExamBotException(Exception):
    """Base exception for application errors."""
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)


class ExamNotFoundException(ExamBotException):
    pass


class QuestionNotFoundException(ExamBotException):
    pass


class AttemptNotFoundException(ExamBotException):
    pass


class ExamExpiredException(ExamBotException):
    pass


class AlreadyAnsweredException(ExamBotException):
    pass


class AttemptAlreadyCompletedException(ExamBotException):
    pass


class OneAttemptOnlyException(ExamBotException):
    pass
