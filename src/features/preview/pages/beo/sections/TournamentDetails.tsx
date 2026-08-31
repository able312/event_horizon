import { useTournamentDetailsSection } from "~/hooks/useTournamentDetailsSection"

export const TournamentDetails = () => {
    const { data: details } = useTournamentDetailsSection()
    return (
        <div>
           <dl className="flex justify-between">

              <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                <dt className="text-muted-foreground">Start time</dt>
                <dd className="font-medium">{details?.time}</dd>

                <dt className="text-muted-foreground">Start format</dt>
                <dd className="font-medium">{details?.startFormat}</dd>

                <dt className="text-muted-foreground">Lead carts</dt>
                <dd className="font-medium">{details?.leadCarts}</dd>
              </div>

              <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                <dt className="text-muted-foreground">Players</dt>
                <dd className="font-medium">{details?.numberOfPlayers}</dd>
                
                <dt className="text-muted-foreground">Golf format</dt>
                <dd className="font-medium">{details?.playFormat}</dd>

                <dt className="text-muted-foreground">Pace of play</dt>
                <dd className="font-medium">{details?.paceOfPlay}</dd>
              </div>
            </dl>

            {details?.notes && (
            <div className="mt-3 pt-3 border-t text-sm">
                <p className="text-muted-foreground mb-1">Notes</p>
                <pre className="font-sans whitespace-pre-wrap">{details.notes}</pre>
            </div>
            )}
        </div>
    )
}