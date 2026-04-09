"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
/**
 * Middleware factory that validates req.body against a Zod schema.
 * Returns 400 with field-level errors on failure.
 */
function validate(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            const errors = result.error.flatten().fieldErrors;
            res.status(400).json({ status: 'fail', errors });
            return;
        }
        req.body = result.data;
        next();
    };
}
//# sourceMappingURL=validate.js.map