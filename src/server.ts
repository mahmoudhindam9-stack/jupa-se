import "./lib/error-capture";
import { GoogleGenAI } from "@google/genai";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);

      if (url.pathname === "/api/chat" && request.method === "POST") {
        const { messages, model = "gemini-3.5-flash" } = await request.json();
        const ai = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            },
          },
        });

        const contents = messages.map((m: any) => ({
          role: m.role,
          parts: [{ text: m.text }],
        }));

        const response = await ai.models.generateContentStream({
          model: model,
          contents: contents,
          config: {
            systemInstruction:
              "You are a helpful and professional AI assistant for Restocash, a restaurant management and point-of-sale system. Help users with their questions, suggest features, and provide clear and concise answers.",
          },
        });

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of response) {
                if (chunk.text) {
                  controller.enqueue(encoder.encode(chunk.text));
                }
              }
            } catch (err) {
              console.error("Gemini stream error:", err);
            } finally {
              controller.close();
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/plain",
            "Transfer-Encoding": "chunked",
          },
        });
      }

      if (url.pathname === "/api/github/push" && request.method === "POST") {
        try {
          const body = await request.json();
          const token = body?.token?.trim();
          const targetRepo = body?.repo?.trim() || "mahmoudhindam9-stack/jupa-sep";
          const commitMsg = body?.commitMessage?.trim() || "تحديثات النظام وإصلاح الأكواد";

          if (!token) {
            return new Response(
              JSON.stringify({
                error: "يرجى إدخال GitHub Personal Access Token (رمز الوصول الشخصي) لتخويل الرفع.",
              }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              },
            );
          }

          const { execSync } = await import("node:child_process");

          // Ensure git user is set
          try {
            execSync('git config user.name "mahmoudhindam9-stack"', { stdio: "pipe" });
            execSync('git config user.email "mahmoudhindam9@gmail.com"', { stdio: "pipe" });
          } catch (e) {}

          // Add any pending changes and commit
          try {
            execSync("git add -A", { stdio: "pipe" });
            const cleanMsg = commitMsg.replace(/"/g, '\\"');
            execSync(`git commit -m "${cleanMsg}"`, { stdio: "pipe" });
          } catch (cErr) {
            // Nothing new to commit is fine
          }

          // Push to GitHub using token authentication
          const sanitizedToken = encodeURIComponent(token);
          const pushUrl = `https://${sanitizedToken}@github.com/${targetRepo}.git`;

          const pushOutput = execSync(`git push ${pushUrl} main`, {
            encoding: "utf8",
            stdio: "pipe",
          });

          return new Response(
            JSON.stringify({
              success: true,
              message: `تم رفع التحديثات إلى GitHub (${targetRepo}) بنجاح! 🚀`,
              output: pushOutput || "Updates pushed successfully",
            }),
            {
              headers: { "Content-Type": "application/json" },
            },
          );
        } catch (pushErr: any) {
          console.error("Git push failed:", pushErr);
          const errMsg = pushErr?.stderr?.toString() || pushErr?.message || "فشلت عملية الرفع";
          let friendlyMsg = errMsg;
          if (
            errMsg.includes("Authentication failed") ||
            errMsg.includes("Invalid username or token")
          ) {
            friendlyMsg =
              "فشل المصادقة: رمز GitHub Token غير صحيح أو انتهت صلاحيته أو لا يملك صلاحية repo.";
          } else if (errMsg.includes("Permission to") && errMsg.includes("denied")) {
            friendlyMsg =
              "تم رفض الإذن: تأكد من أن الرمز يملك صلاحيات الكتابة write على هذا المستودع.";
          }
          return new Response(
            JSON.stringify({
              error: friendlyMsg,
              details: errMsg,
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
