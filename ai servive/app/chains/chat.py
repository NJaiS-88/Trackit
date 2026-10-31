"""General Trackit assistant: the reference pattern for new chains (prompt | model | parser)."""

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import Runnable

from app.llm import get_llm
from app.schemas import ChatMessage

SYSTEM_PROMPT = (
    "You are Trackit's assistant for an IT incident management system used by employees, Leads and admins. "
    "Answer clearly and concisely. If you don't know something about the user's organisation or tickets, "
    "say so instead of guessing."
)

prompt = ChatPromptTemplate.from_messages(
    [
        ("system", SYSTEM_PROMPT),
        MessagesPlaceholder("history"),
        ("human", "{question}"),
    ]
)


def build_chat_chain(llm: BaseChatModel | None = None) -> Runnable:
    """`llm` can be swapped for a fake model in tests."""
    return prompt | (llm or get_llm()) | StrOutputParser()


def to_messages(history: list[ChatMessage]) -> list[BaseMessage]:
    return [
        HumanMessage(content=m.content) if m.role == "user" else AIMessage(content=m.content)
        for m in history
    ]


async def answer(question: str, history: list[ChatMessage], llm: BaseChatModel | None = None) -> str:
    chain = build_chat_chain(llm)
    return await chain.ainvoke({"question": question, "history": to_messages(history)})
