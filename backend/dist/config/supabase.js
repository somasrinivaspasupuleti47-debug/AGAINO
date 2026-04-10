"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const env_1 = require("./env");
if (!env_1.env.SUPABASE_URL || !env_1.env.SUPABASE_ANON_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be defined');
}
exports.supabase = (0, supabase_js_1.createClient)(env_1.env.SUPABASE_URL, env_1.env.SUPABASE_ANON_KEY);
//# sourceMappingURL=supabase.js.map