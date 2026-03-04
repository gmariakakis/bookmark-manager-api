export const validate =
  (schema, target = 'body') =>
  (req, res, next) => {
    const parsed = schema.safeParse(req[target] ?? {});

    if (!parsed.success) {
      return next(parsed.error);
    }

    req[target] = parsed.data;
    return next();
  };
