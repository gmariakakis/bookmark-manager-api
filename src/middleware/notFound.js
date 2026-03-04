export function notFound(req, res) {
  return res.status(404).json({
    error: {
      message: 'Route not found',
      code: 'NOT_FOUND',
    },
  });
}

export default notFound;
