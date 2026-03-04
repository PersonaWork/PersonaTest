/**
 * Standard API response helpers.
 * Use these in EVERY API route for consistent response shapes.
 */

export function successResponse(data: unknown, status = 200) {
    return Response.json({ success: true, data }, { status });
}

export function errorResponse(message: string, status = 500) {
    return Response.json({ success: false, error: message }, { status });
}
