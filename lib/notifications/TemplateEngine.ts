import Handlebars from "handlebars";

export class TemplateEngine {
  /**
   * Compiles and hydrates a template string with the provided variables.
   * Uses Handlebars under the hood.
   *
   * @param templateString The raw template string containing {{variable}} placeholders.
   * @param variables The variables object to inject into the template.
   * @returns The fully hydrated string.
   */
  static hydrate(
    templateString: string,
    variables: Record<string, any> = {}
  ): string {
    if (!templateString) return "";
    try {
      const template = Handlebars.compile(templateString, {
        strict: false, // Don't throw on missing variables, just leave empty
      });
      return template(variables);
    } catch (error) {
      console.error("Template hydration failed:", error);
      return templateString; // Fallback to raw string on error
    }
  }
}
