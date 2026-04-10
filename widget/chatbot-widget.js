/**
* BuildCalc Chatbot Widget
* Embeddable chat widget for the BuildCalc construction cost estimator.
*
* Usage (single script tag — CSS is auto-loaded):
*   <script src="https://your-vercel-app.vercel.app/widget/chatbot-widget.js"></script>
*   <script>
*     BuildCalcChat.init({
*       apiUrl: "https://buildbot5510-buildbot.hf.space/chat",
*       registerUrl: "https://your-backend.com/api/register",
*       orgId: "your-org-id"
*     });
*   </script>
*/

(function () {
 "use strict";

 // Auto-inject CSS from the same directory as this script
 (function loadCSS() {
   const scripts = document.getElementsByTagName("script");
   const currentScript = scripts[scripts.length - 1];
   const scriptSrc = currentScript.src;
   const cssUrl = scriptSrc.replace("chatbot-widget.js", "chatbot-widget.css");

   if (!document.querySelector(`link[href="${cssUrl}"]`)) {
     const link = document.createElement("link");
     link.rel = "stylesheet";
     link.href = cssUrl;
     document.head.appendChild(link);
   }
 })();

 const BuildCalcChat = {
   // -- Configuration (overridden by init()) --
   config: {
     apiUrl: "https://buildbot5510-buildbot.hf.space/chat",
     registerUrl: "", // API endpoint to register user: POST { name, mobile, orgId } → { name, session_id }
     orgId: "", // Hardcoded organization ID to pass with registration
     botName: "BuildCalc",
     botTagline: "Construction Cost Estimator",
     welcomeMessage:
       "Hello! I'm BuildCalc. I can help you get a preliminary estimate for your construction project. Just describe what you're planning!",
   },
   clientThemes: {
     mathapathi: {
       "--buildcalc-primary": "#0f5ea8",
       "--buildcalc-primary-2": "#1d7ad1",
       "--buildcalc-primary-soft": "#87b9ea",
       "--buildcalc-primary-text-soft": "#d9ebff",
       "--buildcalc-primary-strong-text": "#114a82",
       "--buildcalc-form-bg-start": "#eff7ff",
       "--buildcalc-form-bg-end": "#e3f1ff",
       "--buildcalc-form-focus-shadow": "rgba(29, 122, 209, 0.18)",
     },
   },

   sessionId: null,
   userName: null,
   userMobile: null,

   /** Initialise the widget and inject DOM */
   init(options = {}) {
     Object.assign(this.config, options);
     this._injectHTML();
     this._applyClientTheme();
     this._bindEvents();

     // Auto-open the chatbot when the page loads
     this._autoOpen();
   },

   /* -------------------------------------------------- *
    *  DOM injection
    * -------------------------------------------------- */
   _injectHTML() {
     const container = document.createElement("div");
     container.className = "chatbot-widget";
     container.innerHTML = `
       <!-- Toggle Button -->
       <button id="buildcalc-chat-toggle" aria-label="Open chat">
         <svg class="icon-chat" viewBox="0 0 64 64" fill="none">
           <!-- AI Bot Head -->
           <rect x="14" y="18" width="36" height="30" rx="8" fill="#ffffff"/>
           <!-- Eyes -->
           <circle cx="25" cy="31" r="4" fill="#6a1b9a"/>
           <circle cx="39" cy="31" r="4" fill="#6a1b9a"/>
           <!-- Eye glints -->
           <circle cx="26.5" cy="29.5" r="1.2" fill="#ce93d8"/>
           <circle cx="40.5" cy="29.5" r="1.2" fill="#ce93d8"/>
           <!-- Mouth / smile -->
           <path d="M26 40 Q32 45 38 40" stroke="#6a1b9a" stroke-width="2.2" fill="none" stroke-linecap="round"/>
           <!-- Antenna -->
           <line x1="32" y1="18" x2="32" y2="10" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
           <circle cx="32" cy="8" r="3.5" fill="#ce93d8"/>
           <!-- Ear nodes -->
           <circle cx="11" cy="30" r="3.5" fill="#ce93d8"/>
           <circle cx="53" cy="30" r="3.5" fill="#ce93d8"/>
         </svg>
         <svg class="icon-close" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="#ffffff"/></svg>
       </button>

       <!-- Chat Window -->
       <div id="buildcalc-chat-window">
         <div id="buildcalc-chat-header">
           <div class="avatar">
             <svg viewBox="0 0 48 48" fill="none" width="36" height="36">
               <rect x="8" y="14" width="32" height="24" rx="7" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.4)" stroke-width="1.5"/>
               <circle cx="19" cy="25" r="3" fill="#ce93d8"/>
               <circle cx="29" cy="25" r="3" fill="#ce93d8"/>
               <path d="M19 32 Q24 36 29 32" stroke="rgba(255,255,255,0.8)" stroke-width="1.8" fill="none" stroke-linecap="round"/>
               <line x1="24" y1="14" x2="24" y2="8" stroke="rgba(255,255,255,0.6)" stroke-width="2" stroke-linecap="round"/>
               <circle cx="24" cy="6" r="2.5" fill="#ce93d8"/>
               <circle cx="5.5" cy="24" r="2.5" fill="rgba(255,255,255,0.3)"/>
               <circle cx="42.5" cy="24" r="2.5" fill="rgba(255,255,255,0.3)"/>
             </svg>
           </div>
           <div class="header-text">
             <h3>${this.config.botName}</h3>
             <div class="agent-status">
               <span class="status-dot"></span>
               <span class="status-text">Agent active — ready to reply</span>
             </div>
           </div>
         </div>

         <!-- User Info Form Overlay -->
         <div id="buildcalc-user-form-overlay">
           <div class="buildcalc-form-container">
             <div class="buildcalc-form-header">
               <div class="buildcalc-form-avatar">
                 <svg viewBox="0 0 48 48" fill="none" width="44" height="44">
                   <rect x="8" y="14" width="32" height="24" rx="7" fill="#f3e5f5" stroke="#ce93d8" stroke-width="1.5"/>
                   <circle cx="19" cy="25" r="3" fill="#9c27b0"/>
                   <circle cx="29" cy="25" r="3" fill="#9c27b0"/>
                   <path d="M19 32 Q24 36 29 32" stroke="#6a1b9a" stroke-width="1.8" fill="none" stroke-linecap="round"/>
                   <line x1="24" y1="14" x2="24" y2="8" stroke="#ce93d8" stroke-width="2" stroke-linecap="round"/>
                   <circle cx="24" cy="6" r="2.5" fill="#9c27b0"/>
                 </svg>
               </div>
               <h3 class="buildcalc-form-title">Hi there!</h3>
               <p class="buildcalc-form-subtitle">Before we begin, tell us a little about yourself.</p>
             </div>
             <div class="buildcalc-form-divider"></div>
             <form id="buildcalc-user-info-form" autocomplete="off">
               <div class="buildcalc-form-field">
                 <label for="buildcalc-user-name">
                   <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor"><path d="M10 10a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 0114 0H3z"/></svg>
                   Name
                 </label>
                 <input type="text" id="buildcalc-user-name" placeholder="e.g. Rahul Sharma" required />
               </div>
               <div class="buildcalc-form-field">
                 <label for="buildcalc-user-mobile">
                   <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/></svg>
                   Mobile Number
                 </label>
                 <input type="tel" id="buildcalc-user-mobile" placeholder="e.g. 9876543210" required />
               </div>
               <div class="buildcalc-form-action">
                 <button type="submit" id="buildcalc-form-submit">
                   Let's Chat
                   <svg viewBox="0 0 20 20" width="14" height="14" fill="#ffffff"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
                 </button>
               </div>
             </form>
           </div>
         </div>

         <div class="chatbot-messages-list"></div>
         <div id="buildcalc-chat-input-area">
           <textarea
             id="buildcalc-chat-input"
             placeholder="Type your message..."
             autocomplete="off"
             rows="1"
           ></textarea>
           <button id="buildcalc-chat-send" aria-label="Send message">
             <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
           </button>
         </div>
         <div id="buildcalc-chat-footer">Powered by BuildCalc AI</div>
       </div>
     `;
     document.body.appendChild(container);
   },

   _applyClientTheme() {
     const normalizedOrgId = (this.config.orgId || "").trim().toLowerCase();
     const theme = this.clientThemes[normalizedOrgId];
     if (!theme) return;

     const widgetRoot = document.querySelector(".chatbot-widget");
     if (!widgetRoot) return;

     Object.entries(theme).forEach(([key, value]) => {
       widgetRoot.style.setProperty(key, value);
     });
   },

   /* -------------------------------------------------- *
    *  Event binding
    * -------------------------------------------------- */
   _bindEvents() {
     const toggle = document.getElementById("buildcalc-chat-toggle");
     const chatWindow = document.getElementById("buildcalc-chat-window");
     const input = document.getElementById("buildcalc-chat-input");
     const sendBtn = document.getElementById("buildcalc-chat-send");
     const userForm = document.getElementById("buildcalc-user-info-form");

     // Toggle open / close
     toggle.addEventListener("click", () => {
       const isOpen = chatWindow.classList.toggle("visible");
       toggle.classList.toggle("open", isOpen);
       if (isOpen) {
         const nameInput = document.getElementById("buildcalc-user-name");
         if (nameInput && nameInput.offsetParent !== null) {
           nameInput.focus();
         } else {
           input.focus();
         }
       }
     });

     // Handle user info form submission
     userForm.addEventListener("submit", async (e) => {
       e.preventDefault();
       const nameVal = document.getElementById("buildcalc-user-name").value.trim();
       const mobileVal = document.getElementById("buildcalc-user-mobile").value.trim();
       const submitBtn = document.getElementById("buildcalc-form-submit");

       if (!nameVal || !mobileVal) return;

       // Disable form while registering
       submitBtn.disabled = true;
       submitBtn.textContent = "Connecting...";

       // Default session fallback (used if registerUrl is not set or call fails)
       this.userName = nameVal;
       this.userMobile = mobileVal;
       this.sessionId = mobileVal;

       try {
         // Call register API if configured
         if (this.config.registerUrl) {
           const res = await fetch(this.config.registerUrl, {
             method: "POST",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify({ name: nameVal, mobile: mobileVal, org: this.config.orgId }),
           });

           if (!res.ok) {
             throw new Error(`Registration failed (${res.status})`);
           }

           const data = await res.json();

           // Override with API response values
           this.sessionId = data.session_id || this.sessionId;
           this.userName = data.name || nameVal;
         }

         // Hide the form overlay
         document.getElementById("buildcalc-user-form-overlay").style.display = "none";

         // Show the chat area
         document.querySelector('.chatbot-messages-list').style.display = "flex";
         document.getElementById("buildcalc-chat-input-area").style.display = "flex";
         document.getElementById("buildcalc-chat-footer").style.display = "block";

         // Show personalized welcome message using the name returned by API
         const welcomeMsg = this.config.welcomeMessage.replace(/^Hello!/, `Hello ${this.userName}!`);
         this._addBotMessage(welcomeMsg);
         input.focus();

       } catch (err) {
         console.error("BuildCalcChat register error:", err);

         // If registerUrl was set and failed, show error
         if (this.config.registerUrl) {
           submitBtn.disabled = false;
           submitBtn.innerHTML = `Let's Chat <svg viewBox="0 0 20 20" width="14" height="14" fill="#ffffff"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>`;

           let errEl = document.getElementById("buildcalc-form-error");
           if (!errEl) {
             errEl = document.createElement("p");
             errEl.id = "buildcalc-form-error";
             errEl.style.cssText = "color:#d32f2f;font-size:13px;text-align:center;margin-top:12px;";
             userForm.appendChild(errEl);
           }
           errEl.textContent = "Could not connect. Please try again.";
         }
       }
     });

     // Send on button click
     sendBtn.addEventListener("click", () => this._handleSend());

     // Send on Enter key (Shift+Enter for new line)
     input.addEventListener("keydown", (e) => {
       if (e.key === "Enter" && !e.shiftKey) {
         e.preventDefault();
         this._handleSend();
       }
     });

     // Auto-resize textarea as user types
     input.addEventListener("input", () => {
       this._autoResizeInput(input);
     });

     // Initially hide chat messages and input (form is shown first)
     document.querySelector('.chatbot-messages-list').style.display = "none";
     document.getElementById("buildcalc-chat-input-area").style.display = "none";
     document.getElementById("buildcalc-chat-footer").style.display = "none";

     // Keep the widget aligned with the visible viewport when mobile keyboards appear.
     this._syncViewportMetrics();
     if (window.visualViewport) {
       window.visualViewport.addEventListener("resize", () => this._syncViewportMetrics());
       window.visualViewport.addEventListener("scroll", () => this._syncViewportMetrics());
     }
     window.addEventListener("resize", () => this._syncViewportMetrics());

     // While typing on mobile, keep latest messages visible.
     input.addEventListener("focus", () => {
       this._syncViewportMetrics();
       this._scrollToBottom();
     });
     input.addEventListener("blur", () => this._syncViewportMetrics());
   },

   _syncViewportMetrics() {
     const viewport = window.visualViewport;
     const offsetTop = viewport ? viewport.offsetTop : 0;
     const viewportHeight = viewport ? viewport.height : window.innerHeight;
     const keyboardInset = Math.max(0, window.innerHeight - viewportHeight - offsetTop);

     document.documentElement.style.setProperty("--buildcalc-viewport-offset-top", `${Math.max(0, Math.round(offsetTop))}px`);
     document.documentElement.style.setProperty("--buildcalc-keyboard-inset", `${Math.round(keyboardInset)}px`);
   },

   /** Grow/shrink the textarea to fit content, max 4 lines */
   _autoResizeInput(el) {
     el.style.height = "auto";
     const maxHeight = 96; // ~4 lines
     el.style.height = Math.min(el.scrollHeight, maxHeight) + "px";
     el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
   },

   /* -------------------------------------------------- *
    *  Auto-open on page load
    * -------------------------------------------------- */
   _autoOpen() {
     const chatWindow = document.getElementById("buildcalc-chat-window");
     const toggle = document.getElementById("buildcalc-chat-toggle");
     const nameInput = document.getElementById("buildcalc-user-name");

     chatWindow.classList.add("visible");
     toggle.classList.add("open");
     setTimeout(() => nameInput.focus(), 400);
   },

   /* -------------------------------------------------- *
    *  Sending messages
    * -------------------------------------------------- */
   async _handleSend() {
     const input = document.getElementById("buildcalc-chat-input");
     const sendBtn = document.getElementById("buildcalc-chat-send");
     const text = input.value.trim();
     if (!text) return;

     // Show user message
     this._addUserMessage(text);
     input.value = "";
     input.style.height = "auto";
     input.disabled = true;
     sendBtn.disabled = true;

     // Show typing indicator
     const typing = this._showTyping();

     try {
       const res = await fetch(this.config.apiUrl, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ message: text, user_id: this.sessionId }),
       });

       if (!res.ok) {
         throw new Error(`Server error (${res.status})`);
       }

       const data = await res.json();
       typing.remove();

       if (data.status === "success") {
         this._addBotMessage(data.response);
       } else {
         this._addBotMessage(
           "Sorry, something went wrong. Please try again."
         );
       }
     } catch (err) {
       typing.remove();
       console.error("BuildCalcChat error:", err);
       this._addBotMessage(
         "Sorry, I couldn't reach the server. Please check your connection and try again."
       );
     } finally {
       input.disabled = false;
       sendBtn.disabled = false;
       input.focus();
     }
   },

   /* -------------------------------------------------- *
    *  Message helpers
    * -------------------------------------------------- */
   _addUserMessage(text) {
     const container = document.querySelector('.chatbot-messages-list');
     const el = document.createElement("div");
     el.className = "chatbot-message chatbot-message-outgoing";
     el.innerHTML = `<div class="chatbot-message-bubble">${text}</div>`;
     container.appendChild(el);
     this._scrollToBottom();
   },

   _addBotMessage(text) {
     const container = document.querySelector('.chatbot-messages-list');
     const el = document.createElement("div");
     el.className = "chatbot-message chatbot-message-incoming";
     el.innerHTML = `<div class="chatbot-message-bubble">${this._parseMarkdown(text)}</div>`;
     container.appendChild(el);
     this._scrollToBottom();
   },

   /**
    * Lightweight markdown-to-HTML parser.
    * Supports: **bold**, *italic*, `code`, bullet lists (- / *),
    * numbered lists (1.), headings (### ), and paragraphs.
    */
   _parseMarkdown(text) {
     // Escape HTML entities first to prevent XSS
     let html = text
       .replace(/&/g, "&amp;")
       .replace(/</g, "&lt;")
       .replace(/>/g, "&gt;");

     // Split into lines for block-level processing
     const lines = html.split("\n");
     const output = [];
     let inUl = false;
     let inOl = false;

     for (let i = 0; i < lines.length; i++) {
       let line = lines[i];

       // Headings: ### text
       const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
       if (headingMatch) {
         if (inUl) { output.push("</ul>"); inUl = false; }
         if (inOl) { output.push("</ol>"); inOl = false; }
         const level = headingMatch[1].length;
         output.push(`<h${level + 2}>${this._parseInline(headingMatch[2])}</h${level + 2}>`);
         continue;
       }

       // Unordered list: - item or * item (but not **bold**)
       const ulMatch = line.match(/^[\s]*[-*]\s+(.+)$/);
       if (ulMatch && !/^\*\*/.test(line.trim())) {
         if (inOl) { output.push("</ol>"); inOl = false; }
         if (!inUl) { output.push("<ul>"); inUl = true; }
         output.push(`<li>${this._parseInline(ulMatch[1])}</li>`);
         continue;
       }

       // Ordered list: 1. item
       const olMatch = line.match(/^[\s]*\d+[.)]\s+(.+)$/);
       if (olMatch) {
         if (inUl) { output.push("</ul>"); inUl = false; }
         if (!inOl) { output.push("<ol>"); inOl = true; }
         output.push(`<li>${this._parseInline(olMatch[1])}</li>`);
         continue;
       }

       // Close any open lists
       if (inUl) { output.push("</ul>"); inUl = false; }
       if (inOl) { output.push("</ol>"); inOl = false; }

       // Empty line = paragraph break
       if (line.trim() === "") {
         output.push('<div class="bc-paragraph-break"></div>');
         continue;
       }

       // Normal text line
       output.push(`<p>${this._parseInline(line)}</p>`);
     }

     // Close any remaining open lists
     if (inUl) output.push("</ul>");
     if (inOl) output.push("</ol>");

     return output.join("");
   },

   /** Parse inline markdown: **bold**, *italic*, `code` */
   _parseInline(text) {
     return text
       // Bold: **text**
       .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
       // Italic: *text* (but not inside bold)
       .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>")
       // Inline code: `text`
       .replace(/`(.+?)`/g, '<code class="bc-inline-code">$1</code>');
   },

   _showTyping() {
     const container = document.querySelector('.chatbot-messages-list');
     const el = document.createElement("div");
     el.className = "chatbot-typing";
     el.innerHTML = "<span></span><span></span><span></span>";
     container.appendChild(el);
     this._scrollToBottom();
     return el;
   },

   _scrollToBottom() {
     const container = document.querySelector('.chatbot-messages-list');
     requestAnimationFrame(() => {
       container.scrollTop = container.scrollHeight;
     });
   },
 };

 // Expose globally
 window.BuildCalcChat = BuildCalcChat;
})();
