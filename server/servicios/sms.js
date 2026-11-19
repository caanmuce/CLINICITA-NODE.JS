const SMS_PROVIDER = String(process.env.SMS_PROVIDER || "mock").toLowerCase();
const SMS_TIMEOUT_MS = 8000;

function normalizarTelefonoSMS(telefono) {
    let numero = String(telefono || "").replace(/@c\.us$/i, "").replace(/[^\d+]/g, "");
    if (numero.startsWith("00")) numero = `+${numero.slice(2)}`;
    if (/^3\d{9}$/.test(numero)) numero = `+57${numero}`;
    else if (/^57(3\d{9})$/.test(numero)) numero = `+${numero}`;
    else if (/^\+?57(3\d{9})$/.test(numero)) numero = `+${numero.replace(/^\+/, "")}`;
    return numero;
}

function basicAuth(user, password) {
    return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
}

async function enviarMock({ pacienteId, citaId, telefono, mensaje }) {
    const id = `mock-${Date.now()}`;
    console.log("[SMS MOCK]", JSON.stringify({ id, pacienteId, citaId, telefono, mensaje }));
    return { enviado: true, proveedor: "mock", id, error: null };
}

async function enviarAndroidGateway({ telefono, mensaje }) {
    const baseUrl = String(process.env.SMS_GATEWAY_URL || "http://192.168.1.100:8080").replace(/\/+$/, "");
    const endpoint = /\/message$/i.test(baseUrl) ? baseUrl : `${baseUrl}/message`;
    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            Authorization: basicAuth(process.env.SMS_GATEWAY_USER || "sms", process.env.SMS_GATEWAY_PASSWORD || ""),
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ textMessage: { text: mensaje }, phoneNumbers: [telefono] }),
        signal: AbortSignal.timeout(SMS_TIMEOUT_MS)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(`Android SMS Gateway respondió HTTP ${response.status}: ${data.message || response.statusText}`);
    }
    return { enviado: true, proveedor: "android_gateway", id: data.id || data.messageId || null, error: null };
}

async function enviarTwilio({ telefono, mensaje }) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_FROM_NUMBER;
    if (!accountSid || !authToken || !fromNumber) {
        throw new Error("Faltan TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN o TWILIO_FROM_NUMBER");
    }

    const body = new URLSearchParams({ To: telefono, From: fromNumber, Body: mensaje });
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`, {
        method: "POST",
        headers: {
            Authorization: basicAuth(accountSid, authToken),
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body,
        signal: AbortSignal.timeout(SMS_TIMEOUT_MS)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`Twilio respondió HTTP ${response.status}: ${data.message || response.statusText}`);
    return { enviado: true, proveedor: "twilio", id: data.sid || null, error: null };
}

async function enviarSMS({ pacienteId, citaId, telefono, mensaje }) {
    const proveedor = SMS_PROVIDER;
    const numero = normalizarTelefonoSMS(telefono);
    if (!numero) return { enviado: false, proveedor, id: null, error: "Número de teléfono vacío o inválido" };

    try {
        if (proveedor === "mock") return await enviarMock({ pacienteId, citaId, telefono: numero, mensaje });
        if (proveedor === "android_gateway") return await enviarAndroidGateway({ telefono: numero, mensaje });
        if (proveedor === "twilio") return await enviarTwilio({ telefono: numero, mensaje });
        throw new Error(`SMS_PROVIDER no soportado: ${proveedor}`);
    } catch (error) {
        console.warn(`[SMS:${proveedor}] No se pudo enviar SMS a ${numero}: ${error.message}`);
        return { enviado: false, proveedor, id: null, error: error.message };
    }
}

module.exports = { enviarSMS, normalizarTelefonoSMS };
