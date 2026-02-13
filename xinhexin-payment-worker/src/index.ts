import puppeteer from "@cloudflare/puppeteer";

export interface Env {
    MYBROWSER: any;
    AI: any;
    huilaitong_username?: string;
    huilaitong_password?: string;
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        if (request.method !== "POST") {
            return new Response("Method not allowed", { status: 405 });
        }

        const body: any = await request.json().catch(() => ({}));
        const { productName = "中国人寿财险机动车商业保险", amount } = body;

        const USERNAME = env.huilaitong_username;
        const PASSWORD = env.huilaitong_password;

        if (!USERNAME || !PASSWORD) {
            return new Response(
                JSON.stringify({ error: "Missing huilaitong credentials. Please configure secrets." }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }

        let browser;
        try {
            browser = await puppeteer.launch(env.MYBROWSER);
            const page = await browser.newPage();

            // 1. Go to Login Page
            await page.goto("https://user.huilaitongpay.com/user/login?redirect=%2Fmain", { waitUntil: 'networkidle0' });

            // 2. Handle CAPTCHA with AI (Retry logic)
            const MAX_RETRIES = 3;
            let loggedIn = false;

            for (let i = 0; i < MAX_RETRIES; i++) {
                // Check if already logged in (url changed or element exists)
                if (page.url().includes("/main") || (await page.$(".user-name"))) {
                    loggedIn = true;
                    break;
                }

                // Screenshot CAPTCHA element
                const captchaEl = await page.waitForSelector("#usercode-img"); // Verify selector ID
                if (!captchaEl) throw new Error("Captcha element not found");

                const captchaBuffer = await captchaEl.screenshot();
                const imageArray = [...new Uint8Array(captchaBuffer)];

                // Solve with AI
                const responses: any = await env.AI.run("@cf/meta/llama-3.2-11b-vision-instruct", {
                    messages: [{ role: "user", content: "Please only return the 4 alphanumeric characters in this image. Do not add any other text." }],
                    image: imageArray
                });

                const captchaText = responses.response.trim().replace(/[^a-zA-Z0-9]/g, "");
                console.log(`Attempt ${i + 1}: AI solved CAPTCHA as: ${captchaText}`);

                // Fill Form
                await page.ifType("#username", USERNAME); // Check selector
                await page.type("#password", PASSWORD);   // Check selector
                await page.type("#usercode", captchaText);               // Check selector

                // Click Login
                await Promise.all([
                    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 }).catch(() => { }),
                    page.click(".login-btn") // Check selector
                ]);

                // Check success
                if (page.url().includes("/main")) {
                    loggedIn = true;
                    break;
                } else {
                    // Clear inputs and refresh captcha if needed
                    await page.evaluate(() => {
                        (document.querySelector("#username") as HTMLInputElement).value = "";
                        (document.querySelector("#password") as HTMLInputElement).value = "";
                        (document.querySelector("#usercode") as HTMLInputElement).value = "";
                        (document.querySelector("#usercode-img") as HTMLElement).click(); // Refresh captcha
                    });
                    await new Promise(r => setTimeout(r, 1000));
                }
            }

            if (!loggedIn) {
                return new Response(JSON.stringify({ error: "Failed to login after retries" }), { status: 401 });
            }

            // 3. Navigate to Payment Link Page (Second Submenu)
            // Need to inspect the main page to find the correct selector for "Merchant Management" -> Link
            // Assuming we land on main, we might need to click menu items.
            // For now, let's try to assume a direct URL or simulate clicks.
            // The user screenshot shows "商户管理" (Merchant Management)

            // To be robust, let's just log the success for now as we don't have the exact post-login DOM structure.
            // I'll return a mock link for verification until I can inspect the post-login page in the next step.

            /* 
               REAL IMPLEMENTATION TODO:
               1. Click "商户管理"
               2. Update "商品名称" to productName
               3. Click "保存/生成"
               4. Extract QR link
            */

            // Placeholder for now
            return new Response(JSON.stringify({
                success: true,
                payment_link: "https://pay.huilaitongpay.com/qr/MOCK_LINK_" + Date.now(),
                note: "Login successful. Link generation logic pending DOM inspection."
            }), {
                headers: { "Content-Type": "application/json" }
            });

        } catch (e: any) {
            return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }
}
