// pb_public/assets/pb.js
// Usage in HTML:
// <script src="/assets/pocketbase.umd.js"></script>
// <script type="module">
//   import { pb, login, requireAuth, list } from "/assets/pb.js";
// </script>

const DEFAULT_BASE_URL = "http://127.0.0.1:8090";

// You can override this in any HTML page before importing pb.js:
// <script>window.PB_BASE_URL = "http://127.0.0.1:8090";</script>
export const BASE_URL = (window.PB_BASE_URL || DEFAULT_BASE_URL).replace(
    /\/+$/,
    "",
);

// --- init client ---
if (!window.PocketBase) {
    throw new Error(
        "PocketBase SDK not found. Include /assets/pocketbase.umd.js before importing /assets/pb.js",
    );
}

export const pb = new window.PocketBase(BASE_URL);

// --- tiny helpers ---
export function isAuthed() {
    return !!pb.authStore?.isValid;
}

export function authRecord() {
    return pb.authStore?.record || null;
}

export function authToken() {
    return pb.authStore?.token || "";
}

export function isMaybeAdmin() {
    return pb.authStore?.record?.isAdmin || false;
}

export function filter(expr, params) {
    // Convenient and safe builder for filter strings
    return pb.filter(expr, params);
}

function getNextParam() {
    const next = location.pathname + location.search + location.hash;
    return encodeURIComponent(next);
}

function redirectToLogin(loginPath = "/login.html") {
    // Save where to return
    location.replace(`${loginPath}?next=${getNextParam()}`);
}

/**
 * requireAuth({ loginPath? })
 * If not logged in -> redirect to login.html
 */
export function requireAuth(opts = {}) {
    if (!isAuthed()) redirectToLogin(opts.loginPath || "/login.html");
}

/**
 * login(username, password, authCollection="users")
 * identity can be username or email — depends on the auth collection settings.
 */
export async function login(username, password, authCollection = "users") {
    if (!username || !password)
        throw new Error("username and password are required");
    try {
        return await pb
            .collection(authCollection)
            .authWithPassword(username, password);
    } catch (e) {
        throw normalizePbError(e);
    }
}

/**
 * logout()
 */
export function logout() {
    pb.authStore.clear();
}

/**
 * register(data, authCollection="users", { autoLogin?: boolean })
 * data: { username, password, passwordConfirm?, email?, ...customFields }
 */
export async function register(data, authCollection = "users", opts = {}) {
    if (!data || typeof data !== "object")
        throw new Error("register(data): data must be an object");

    const payload = { ...data };

    // PocketBase usually expects passwordConfirm for auth records
    if (payload.password && !payload.passwordConfirm) {
        payload.passwordConfirm = payload.password;
    }

    try {
        const record = await pb.collection(authCollection).create(payload);

        if (opts.autoLogin && payload.password) {
            // identity can be username or email — try username first, then email
            const identity = payload.username || payload.email;
            if (identity)
                await login(identity, payload.password, authCollection);
        }

        return record;
    } catch (e) {
        throw normalizePbError(e);
    }
}

/**
 * list(collection, {page=1, perPage=20, filter="", sort="-created", expand?, fields?})
 */
export async function list(collection, opts = {}) {
    if (!collection)
        throw new Error("list(collection): collection is required");

    const {
        page = 1,
        perPage = 20,
        filter: f = "",
        sort = "-created",
        expand = "",
        fields = "",
    } = opts;

    const options = {};
    if (f) options.filter = f;
    if (sort) options.sort = sort;
    if (expand) options.expand = expand;
    if (fields) options.fields = fields;

    try {
        return await pb.collection(collection).getList(page, perPage, options);
    } catch (e) {
        throw normalizePbError(e);
    }
}

/**
 * create(collection, data)
 */
export async function create(collection, data) {
    if (!collection)
        throw new Error("create(collection): collection is required");
    if (!data || typeof data !== "object")
        throw new Error("create(...): data must be an object");

    try {
        return await pb.collection(collection).create(data);
    } catch (e) {
        throw normalizePbError(e);
    }
}

/**
 * update(collection, id, data)
 */
export async function update(collection, id, data) {
    if (!collection)
        throw new Error("update(collection): collection is required");
    if (!id) throw new Error("update(...): id is required");
    if (!data || typeof data !== "object")
        throw new Error("update(...): data must be an object");

    try {
        return await pb.collection(collection).update(id, data);
    } catch (e) {
        throw normalizePbError(e);
    }
}

/**
 * remove(collection, id, mode?)
 * Default is hard delete.
 * If you want to "archive", pass mode:
 *   remove("cards", id, { archive: true, field: "status", value: "archived" })
 */
export async function remove(collection, id, mode = null) {
    if (!collection)
        throw new Error("remove(collection): collection is required");
    if (!id) throw new Error("remove(...): id is required");

    try {
        if (mode?.archive) {
            const field = mode.field || "status";
            const value = mode.value || "archived";
            return await pb
                .collection(collection)
                .update(id, { [field]: value });
        }
        return await pb.collection(collection).delete(id);
    } catch (e) {
        throw normalizePbError(e);
    }
}

// --- error normalization (so it's easy to display on forms) ---
function normalizePbError(err) {
    // PocketBase SDK throws ClientResponseError with shape { status, response, message }
    const status = err?.status;
    const response = err?.response;

    // PB often returns { data: {field: {message, code}}}
    const fieldErrors = response?.data || null;

    const msg = response?.message || err?.message || "Unknown error";

    const e = new Error(msg);
    e.status = status;
    e.fieldErrors = fieldErrors; // can be rendered in forms
    e.raw = err;
    return e;
}
