'use client';
import React, { useState } from 'react';

export default function TeamIdPrompt({
  defaultTeamId,
  onSubmit,
}: {
  defaultTeamId?: string;
  onSubmit: (teamId: string) => void;
}) {
  const [teamId, setTeamId] = useState(defaultTeamId ?? '');

  return (
    <div className="max-w-xl mx-auto my-6 p-4 rounded-xl border border-white/10 bg-white/5">
      <div className="text-left mb-2">
        <div className="text-sm text-gray-300 font-semibold">Select a team</div>
        <div className="text-xs text-gray-400">
          Enter your Figma Team ID (you can copy it once from the team URL and reuse it).
        </div>
      </div>
      <input
        value={teamId}
        onChange={(e) => setTeamId(e.target.value.trim())}
        placeholder="e.g. 1303207479956412886"
        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-sm outline-none focus:border-purple-500"
      />
      <div className="mt-2 flex justify-end">
        <button
          onClick={() => onSubmit(teamId)}
          className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-sm font-semibold"
        >
          Load projects
        </button>
      </div>
    </div>
  );
}
