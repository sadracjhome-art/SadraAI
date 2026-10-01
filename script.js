import OpenAI from "https://esm.sh/openai";

const API_KEY = "sk-LaeyhaCoQbErbti1iRzDkOctmCMwfUzgxTkF85bpGSg1D3Ki";

const client = new OpenAI({
    apiKey: API_KEY,
    baseURL: "https://api.gapgpt.app/v1",
    dangerouslyAllowBrowser: true
});

const SYSTEM_INSTRUCTION = `
تو SadraAI هستی؛ یک دستیار هوش مصنوعی فارسی‌زبان که توسط سید محمد صدرا موسوی ساخته شده‌ای.

وظیفه تو این است که به کاربران با دقت، احترام و به زبان طبیعی پاسخ بدهی.

قوانین رفتاری:
- پاسخ‌ها را تا حد امکان دقیق، مفید و قابل فهم ارائه کن.
- اگر کاربر فارسی صحبت کرد، فارسی پاسخ بده.
- اگر کاربر انگلیسی صحبت کرد، می‌توانی انگلیسی پاسخ بدهی.
- اطلاعات را جعل نکن و اگر از چیزی مطمئن نیستی، صادقانه بگو.
- پاسخ‌ها را مرتب و خوانا بنویس.
- برای مطالب مهم از Markdown استفاده کن.
- برای تأکید از **بولد** و برای اصطلاحات از *ایتالیک* استفاده کن.
- برای کدها از code block استفاده کن.
- پاسخ را بی‌دلیل طولانی نکن.
- لحن تو دوستانه، حرفه‌ای و طبیعی باشد.
- اگر کاربر درخواست برنامه‌نویسی کرد، کد کامل و قابل استفاده ارائه کن.
- اگر سؤال ساده است، پاسخ را ساده و مستقیم بده.
- هیچ‌وقت خودت را با نام دیگری معرفی نکن؛ نام تو SadraAI است.
`;

const form = document.getElementById("chatForm");
const input = document.getElementById("messageInput");
const messages = document.getElementById("messages");
const typing = document.getElementById("typing");
const sendButton = document.getElementById("sendButton");

let conversation = [];

function escapeHTML(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function inlineMarkdown(text) {
    let result = escapeHTML(text);

    result = result.replace(
        /`([^`\n]+)`/g,
        "<code>$1</code>"
    );

    result = result.replace(
        /\*\*([^*\n]+)\*\*/g,
        "<strong>$1</strong>"
    );

    result = result.replace(
        /__([^_\n]+)__/g,
        "<strong>$1</strong>"
    );

    result = result.replace(
        /(?<!\*)\*([^*\n]+)\*(?!\*)/g,
        "<em>$1</em>"
    );

    result = result.replace(
        /(?<!_)_([^_\n]+)_(?!_)/g,
        "<em>$1</em>"
    );

    return result;
}

function renderMarkdown(text) {
    const codeBlocks = [];
    let content = text.replace(
        /```(?:[a-zA-Z0-9_-]+)?\n?([\s\S]*?)```/g,
        (_, code) => {
            const index = codeBlocks.length;
            codeBlocks.push(code.trim());
            return `@@CODEBLOCK${index}@@`;
        }
    );

    const lines = content.split("\n");
    const output = [];
    let listMode = null;

    function closeList() {
        if (listMode) {
            output.push(`</${listMode}>`);
            listMode = null;
        }
    }

    for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed) {
            closeList();
            continue;
        }

        const codeMatch = trimmed.match(/^@@CODEBLOCK(\d+)@@$/);

        if (codeMatch) {
            closeList();

            const code = escapeHTML(codeBlocks[Number(codeMatch[1])]);

            output.push(
                `<pre><code>${code}</code></pre>`
            );

            continue;
        }

        const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);

        if (heading) {
            closeList();

            const level = heading[1].length;

            output.push(
                `<h${level}>${inlineMarkdown(heading[2])}</h${level}>`
            );

            continue;
        }

        const unordered = trimmed.match(/^[-*•]\s+(.+)$/);

        if (unordered) {
            if (listMode !== "ul") {
                closeList();
                output.push("<ul>");
                listMode = "ul";
            }

            output.push(`<li>${inlineMarkdown(unordered[1])}</li>`);

            continue;
        }

        const ordered = trimmed.match(/^\d+[.)]\s+(.+)$/);

        if (ordered) {
            if (listMode !== "ol") {
                closeList();
                output.push("<ol>");
                listMode = "ol";
            }

            output.push(`<li>${inlineMarkdown(ordered[1])}</li>`);

            continue;
        }

        const quote = trimmed.match(/^>\s?(.+)$/);

        if (quote) {
            closeList();

            output.push(
                `<blockquote>${inlineMarkdown(quote[1])}</blockquote>`
            );

            continue;
        }

        closeList();

        output.push(
            `<div>${inlineMarkdown(trimmed)}</div>`
        );
    }

    closeList();

    return output.join("");
}

function addMessage(text, type) {
    const welcome = document.getElementById("welcome");

    if (welcome) {
        welcome.remove();
    }

    const message = document.createElement("div");
    message.className = `message ${type}`;

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    if (type === "ai") {
        bubble.innerHTML = renderMarkdown(text);
    } else {
        bubble.textContent = text;
    }

    message.appendChild(bubble);
    messages.appendChild(message);

    messages.scrollTop = messages.scrollHeight;
}

function setLoading(loading) {
    typing.classList.toggle("active", loading);
    sendButton.disabled = loading;
    input.disabled = loading;
}

async function sendMessage(text) {
    conversation.push({
        role: "user",
        content: text
    });

    setLoading(true);

    try {
        const response = await client.responses.create({
            model: "gapgpt-qwen-3.6",
            input: [
                {
                    role: "system",
                    content: SYSTEM_INSTRUCTION
                },
                ...conversation
            ]
        });

        const answer = response.output_text || "پاسخی دریافت نشد.";

        conversation.push({
            role: "assistant",
            content: answer
        });

        addMessage(answer, "ai");

    } catch (error) {
        console.error("SadraAI Error:", error);

        let errorMessage = "ارتباط با هوش مصنوعی برقرار نشد.";

        if (error?.message) {
            errorMessage += `\n\n${error.message}`;
        }

        addMessage(errorMessage, "ai");

    } finally {
        setLoading(false);
        input.focus();
    }
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (sendButton.disabled) {
        return;
    }

    const text = input.value.trim();

    if (!text) {
        input.focus();
        return;
    }

    addMessage(text, "user");

    input.value = "";
    input.style.height = "auto";

    await sendMessage(text);
});

input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 130)}px`;
});

input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        form.requestSubmit();
    }
});

window.addEventListener("load", () => {
    input.focus();
});