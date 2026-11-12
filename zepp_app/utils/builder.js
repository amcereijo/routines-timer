/**
 * The path of the routine builder in the web app.
 *
 * It lives in its own module so the build script can use it without
 * importing utils/constants.js — that module imports the generated
 * config, which the build script writes itself.
 */
export const WEB_BUILDER_PATH = '/routines/new'
