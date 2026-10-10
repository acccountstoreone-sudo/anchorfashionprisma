import { supabase } from "../supabase";
import { AIPrompt } from "./types";

export class PromptEngine {
  /**
   * Fetches an active prompt by its name from the registry
   */
  static async getPrompt(name: string): Promise<AIPrompt> {
    const { data, error } = await supabase
      .from("ai_prompts")
      .select("*")
      .eq("name", name)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      throw new Error(
        `Prompt '${name}' not found or is inactive. Error: ${error?.message}`
      );
    }

    return {
      id: data.id,
      name: data.name,
      category: data.category,
      model: data.model,
      systemPrompt: data.system_prompt,
      userPromptTemplate: data.user_prompt_template,
      temperature: data.temperature,
      isActive: data.is_active,
    };
  }

  /**
   * Hydrates a template with variables
   * Example: 'Hello {{name}}' with {name: 'Alice'} becomes 'Hello Alice'
   */
  static hydrateTemplate(
    template: string,
    variables: Record<string, string> = {}
  ): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      // Use regex to replace all occurrences of {{key}}
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
      result = result.replace(regex, value);
    }
    return result;
  }
}
