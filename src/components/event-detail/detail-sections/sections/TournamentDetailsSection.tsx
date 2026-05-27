
import GolfDetailsTimeblock from "~/components/atoms/GolfDetailsTimeblock"
import type { PlayFormat, StartFormat, UpdateTournamentDetails } from "~/definitions/database";
import { ITER_GOLF_PLAY_FORMAT } from "~/definitions/sections/section-constants";
import { useTournamentDetailsSection } from "~/hooks/useTournamentDetailsSection";


const TournamentDetailsSection = () => {

  const { data: tournamentDetails, isLoading, isError, updateTournamentDetails } = useTournamentDetailsSection()
 
  const handleEdit = (id: string, updates: UpdateTournamentDetails) => {
    updateTournamentDetails({id, updates})
  };

  if (isLoading) return (<div className="w-full">Oops... Looks like something went wrong!</div>)

  return (
    <div className="space-y-4">
      
      { isError || !tournamentDetails?.id ? (
        <div className="w-full">Oops... Looks like something went wrong!</div>
      ) : (
      <GolfDetailsTimeblock 
        time={ tournamentDetails?.time ?? "" }
        onTimeChange={ (time: string) => handleEdit(tournamentDetails!.id, {time}) }
      >


      {/* Golf-specific fields go here */}
        <div className="space-y-3">

          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">
              Lead Carts
            </label>
            <input
              defaultValue={tournamentDetails?.leadCarts ?? ""}
              onBlur={(e) => handleEdit(tournamentDetails!.id, { leadCarts: e.target.value })}
              placeholder="Luke, Don, Penny..."
              className="w-full px-2 py-1 text-sm border border-stone-200 rounded bg-white resize-none"
            />
          </div>
          
          {/* Start Format */}
          <div className="flex gap-2">
            <div className="w-1/2">
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Start Format
              </label>
              <select
                defaultValue={tournamentDetails?.startFormat ?? ""}
                onBlur={(e) => handleEdit(tournamentDetails!.id, { startFormat: e.target.value as StartFormat })}
                className="w-full px-2 py-1 text-sm border border-stone-200 rounded bg-white"
              >
                <option value="Shotgun">Shotgun Start</option>
                <option value="Tee Times">Tee Times</option>
              </select>
            </div>
  
            {/* Play Format */}
            <div className="w-1/2">
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Format of Play
              </label>
              <select
                defaultValue={tournamentDetails?.playFormat ?? ""}
                onBlur={(e) => handleEdit(tournamentDetails!.id, { playFormat: e.target.value as PlayFormat })}
                className="w-full px-2 py-1 text-sm border border-stone-200 rounded bg-white"
              >
                {ITER_GOLF_PLAY_FORMAT.map((option: string) => <option key={option} value={option}>{option}</option>)}
                
              </select>
            </div>
          </div>
 
          {/* Number of Players & Pace of Play (side by side) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Number of Players
              </label>
              <input
                type="number"
                defaultValue={tournamentDetails?.numberOfPlayers ?? ""}
                onBlur={(e) => handleEdit(tournamentDetails!.id, { numberOfPlayers: parseInt(e.target.value) || 0 })}
                className="w-full px-2 py-1 text-sm border border-stone-200 rounded bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Estimated Pace of Play (hours)
              </label>
              <input
                type="number"
                defaultValue={tournamentDetails?.paceOfPlay ?? ""}
                onBlur={(e) => handleEdit(tournamentDetails!.id, { paceOfPlay:e.target.value })}
                className="w-full px-2 py-1 text-sm border border-stone-200 rounded bg-white"
              />
            </div>
          </div>
 
          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">
              Notes (Tee Blocks, Flights, Handicaps, Special Rules, etc.)
            </label>
            <textarea
              defaultValue={tournamentDetails?.notes ?? ""}
              onChange={(e) => handleEdit(tournamentDetails!.id, { notes: e.target.value })}
              placeholder="Men's A Flight, Women's Flight, Mulligan rules, etc."
              rows={4}
              className="w-full px-2 py-1 text-sm border border-stone-200 rounded bg-white resize-none"
            />
          </div>

        </div>
      </GolfDetailsTimeblock>
      )}
    </div>
  )
}

export default TournamentDetailsSection
