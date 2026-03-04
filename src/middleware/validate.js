export const validate =
  (schema, target = 'body') =>
  (req, res, next) => {
    const parsed = schema.safeParse(req[target] ?? {});

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        })),
      });
    }

    req[target] = parsed.data;
    return next();
  };
