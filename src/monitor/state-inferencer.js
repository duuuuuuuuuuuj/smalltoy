function inferState(o) {
  if (o.type === 'system' && o.subtype === 'api_error') return 'ERROR';
  if (o.type === 'user' && o.message) return 'THINKING';
  if (o.type === 'assistant' && o.message) {
    if (o.message.stop_reason === 'end_turn') return 'DONE';
    if (o.message.stop_reason === 'tool_use') {
      const content = o.message.content || [];
      const toolUses = content.filter(c => c.type === 'tool_use');
      if (toolUses.length > 0) {
        const name = toolUses[0].name;
        if (['Edit', 'Write', 'NotebookEdit'].includes(name)) return 'CODING';
        if (name === 'Bash') return 'EXECUTING';
        if (name === 'Agent') return 'USING_TOOLS';
        if (name === 'AskUserQuestion') return 'WAITING_INPUT';
        return 'ANALYZING';
      }
    }
  }
  return null;
}

module.exports = { inferState };
