// Common UI/data helpers for the Demo Exam project

export function pbAdminUrl() {
    const base = (window.PB_BASE_URL || "http://127.0.0.1:8090").replace(
        /\/+$/,
        "",
    );
    return base + "/_/";
}

export function toast(message, { kind = "info", timeout = 2600 } = {}) {
    const root = document.createElement("div");
    root.className = "app-toast";

    const article = document.createElement("article");
    article.setAttribute("role", "status");
    article.className = "app-fade-in";

    const strong = document.createElement("strong");
    strong.textContent =
        kind === "error"
            ? "Ошибка"
            : kind === "success"
              ? "Готово"
              : "Сообщение";
    const p = document.createElement("p");
    p.style.margin = "0.25rem 0 0";
    p.textContent = message;

    article.appendChild(strong);
    article.appendChild(p);
    root.appendChild(article);
    document.body.appendChild(root);

    const t = setTimeout(() => {
        root.remove();
        clearTimeout(t);
    }, timeout);
}

// --- flash messages between pages ---
export function setFlash(message, kind = "info") {
    try {
        sessionStorage.setItem(
            "app.flash",
            JSON.stringify({ message, kind, at: Date.now() }),
        );
    } catch {
        /* ignore */
    }
}

export function consumeFlash() {
    try {
        const raw = sessionStorage.getItem("app.flash");
        if (!raw) return null;
        sessionStorage.removeItem("app.flash");
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

// --- formatting ---
export function formatDateTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString("ru-RU", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function statusLabel(status) {
    switch (status) {
        case "pending":
            return "На рассмотрении";
        case "approved":
            return "Одобрено";
        case "completed":
            return "Выполнено";
        case "rejected":
            return "Отклонено";
        default:
            return status || "";
    }
}

export function statusClass(status) {
    if (!status) return "pending";
    const s = String(status).toLowerCase();
    if (["pending", "approved", "completed", "rejected"].includes(s)) return s;
    return "pending";
}

// --- phone mask: +7(XXX)-XXX-XX-XX ---
export function formatRuPhone(value) {
    const raw = String(value || "").replace(/\D/g, "");
    if (!raw) return "";

    // Normalize to 7XXXXXXXXXX
    let digits = raw;
    if (digits.startsWith("8")) digits = "7" + digits.slice(1);
    if (digits.startsWith("9")) digits = "7" + digits;
    if (!digits.startsWith("7")) digits = "7" + digits;
    digits = digits.slice(0, 11);

    const a = digits.slice(1, 4);
    const b = digits.slice(4, 7);
    const c = digits.slice(7, 9);
    const d = digits.slice(9, 11);

    let out = "+7";
    if (a) out += `(${a}`;
    if (a.length === 3) out += ")";
    if (b) out += `-${b}`;
    if (c) out += `-${c}`;
    if (d) out += `-${d}`;
    return out;
}

export function isValidRuPhone(value) {
    return /^\+7\(\d{3}\)-\d{3}-\d{2}-\d{2}$/.test(String(value || ""));
}

// --- Cyrillic login -> PocketBase username (latin)
// We keep a required & unique field loginCyr in the user record,
// but PocketBase auth uses the built-in username/email. To satisfy
// "login in Cyrillic" while keeping auth stable, we derive username
// deterministically from loginCyr.

const RU_MAP = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "e",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "ts",
    ч: "ch",
    ш: "sh",
    щ: "sch",
    ъ: "",
    ы: "y",
    ь: "",
    э: "e",
    ю: "yu",
    я: "ya",
};

function fnv1a32(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        // 32-bit FNV-1a prime
        h = (h + (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)) >>> 0;
    }
    return h >>> 0;
}

export function normalizeCyrLogin(loginCyr) {
    return String(loginCyr || "").trim().toLowerCase();
}

export function cyrLoginToUsername(loginCyr) {
    const norm = normalizeCyrLogin(loginCyr);
    const translit = norm
        .split("")
        .map((ch) => RU_MAP[ch] ?? (/[a-z0-9]/.test(ch) ? ch : ""))
        .join("");

    const base = (translit || "user")
        .replace(/[^a-z0-9]+/g, "")
        .slice(0, 22);

    const hash = fnv1a32(norm).toString(36).slice(-6);
    return `${base}-${hash}`;
}

export function isValidCyrLogin(loginCyr) {
    return /^[А-ЯЁа-яё]{6,}$/.test(String(loginCyr || "").trim());
}

export function isValidCyrFio(fio) {
    return /^[А-ЯЁа-яё]+(?:\s+[А-ЯЁа-яё]+)*$/.test(String(fio || "").trim());
}
