import React from "react"
import { Trash2 } from "lucide-react"

interface Competition {
  id: string
  name: string
  stakes: string
  volunteers: string
  notes: string
}

interface CompetitionsSectionProps {
  competitions: Competition[]
  onChange: (competitions: Competition[]) => void
}

const CompetitionsSection: React.FC<CompetitionsSectionProps> = ({ competitions, onChange }) => {
  const addCompetition = () => {
    const newCompetition: Competition = {
      id: Date.now().toString(),
      name: "",
      stakes: "",
      volunteers: "",
      notes: ""
    }
    onChange([...competitions, newCompetition])
  }

  const updateCompetition = (id: string, field: keyof Competition, value: string) => {
    onChange(competitions.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ))
  }

  const removeCompetition = (id: string) => {
    onChange(competitions.filter(c => c.id !== id))
  }

  return (
    <div className="space-y-4">
      {[{id: "temp-id-1",
        name: "Closest to the Pin",
        stakes: "yes",
        volunteers: "John Apple",
        notes: "Here is my note"}].map((competition, index) => (
        <div key={competition.id} className="border rounded-lg p-3 bg-stone-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Competition {index + 1}</span>
            <button 
              onClick={() => removeCompetition(competition.id)}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Name</label>
              <input
                type="text"
                value={competition.name}
                onChange={(e) => updateCompetition(competition.id, "name", e.target.value)}
                placeholder="e.g., Closest to Pin #3"
                className="w-full px-2 py-1 text-sm border rounded"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Stakes/Fees</label>
              <input
                type="text"
                value={competition.stakes}
                onChange={(e) => updateCompetition(competition.id, "stakes", e.target.value)}
                placeholder="e.g., $10/person"
                className="w-full px-2 py-1 text-sm border rounded"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground">Volunteer Needs</label>
              <input
                type="text"
                value={competition.volunteers}
                onChange={(e) => updateCompetition(competition.id, "volunteers", e.target.value)}
                placeholder="e.g., 1 volunteer needed"
                className="w-full px-2 py-1 text-sm border rounded"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground">Notes</label>
              <textarea
                value={competition.notes}
                onChange={(e) => updateCompetition(competition.id, "notes", e.target.value)}
                placeholder="Additional notes..."
                className="w-full px-2 py-1 text-sm border rounded"
                rows={2}
              />
            </div>
          </div>
        </div>
      ))}
      
      <button
        onClick={addCompetition}
        className="text-sm text-primary hover:underline"
      >
        + Add Competition
      </button>
    </div>
  )
}

export default CompetitionsSection
