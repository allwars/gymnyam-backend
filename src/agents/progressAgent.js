const { chat } = require('./client');

/**
 * Analyzes workout notes (text + voice transcription) against
 * previous workout history to detect progress and generate feedback.
 */
async function analyzeProgress({ user, currentWorkout, notes, voiceNoteText, history }) {
  const system = `Eres un entrenador personal experto en análisis de rendimiento deportivo.
Analiza las notas post-entrenamiento del usuario y su historial para detectar progreso.
Responde ÚNICAMENTE con JSON válido, sin texto adicional:
{
  "progress_detected": true | false,
  "progress_level": "great" | "good" | "neutral" | "struggling",
  "motivation_message": "string (1-2 frases, cálido y específico)",
  "progress_highlights": ["string"] ,
  "tips_for_next": ["string (máx 3 tips concretos)"],
  "next_session_focus": "string (qué trabajar la próxima vez)"
}`;

  const prevSameSport = history
    .filter(w => w.sport === currentWorkout.sport)
    .slice(0, 3);

  const notesText = [
    notes ? `Notas escritas: "${notes}"` : '',
    voiceNoteText ? `Nota de voz (transcripción): "${voiceNoteText}"` : '',
  ].filter(Boolean).join('\n');

  const context = [
    `Perfil: edad ${user.age}, peso ${user.weight}kg, objetivo: ${user.goal}`,
    `Deporte de hoy: ${currentWorkout.sport}`,
    `Entrenamiento de hoy: ${JSON.stringify({
      exercises: currentWorkout.exercises?.map(e => ({ name: e.name, sets: e.sets, reps: e.reps, weight: e.weight })),
      summary: currentWorkout.summary,
    })}`,
    notesText || 'Sin notas adicionales.',
    prevSameSport.length > 0
      ? `Historial previo (mismo deporte):\n${prevSameSport.map((w, i) =>
          `  Sesión -${i + 1} (${w.date}): ${w.notes || 'sin notas'} | ejercicios: ${
            w.exercises?.map(e => `${e.name} ${e.weight || ''}`).join(', ')
          }`
        ).join('\n')}`
      : 'Primera sesión de este deporte.',
  ].filter(Boolean).join('\n');

  return chat(system, `Analiza el progreso de esta sesión:\n${context}`, 600);
}

module.exports = { analyzeProgress };
