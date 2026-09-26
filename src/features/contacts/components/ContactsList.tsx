import { Mails, Plus } from "lucide-react"
import { ClientDetailsCard } from "~/features/event-detail/sections/event-overview/components/ClientDetailsCard"
import { Button } from "~/components/atoms/button"

const ContactsList: React.FC = () => {

    return (
      <section className="border border-stone-200 bg-background rounded-3xl shadow-md pl-4 pt-2 pr-2">
          <div className="pb-2 flex justify-between">
            <h2 className="font-bold text-lg pt-1">Event Team</h2>
            <Button
                type="button"
                variant="outline"
                className="size-8 rounded-full text-orange-500"
                onClick={() => console.log("Click!")}
            >
              <Plus className="size-4" />
            </Button>
          </div>

          <div>
            <p className="pt-2 text-stone-500">Clients</p>
            {[
              { name: "James Patterson", email: "james@test.com", phone: "123.456.7890", eventTitle: "Demo Title" },
              { name: "Gary Moores", email: "gary@test.com", phone: "123.456.7890", eventTitle: "Demo Title" },
              { name: "Sally Sandworm", email: "sally@test.com", phone: "123.456.7890", eventTitle: "Demo Title" },
            ].map(entry => (
              <ClientDetailsCard
                client={{
                  name: entry.name,
                  email: entry.email,
                  phone: entry.phone,
                }}
                eventTitle={entry.eventTitle}
              />
            ))}
          </div>

          <div>
            <p className="pt-6 text-stone-500">Vendors</p>
            {[
              { name: "James Patterson", email: "james@test.com", phone: "123.456.7890", eventTitle: "Demo Title" },
              { name: "Gary Moores", email: "gary@test.com", phone: "123.456.7890", eventTitle: "Demo Title" },
              { name: "Sally Sandworm", email: "sally@test.com", phone: "123.456.7890", eventTitle: "Demo Title" },
            ].map(entry => (
              <ClientDetailsCard
                client={{
                  name: entry.name,
                  email: entry.email,
                  phone: entry.phone,
                }}
                eventTitle={entry.eventTitle}
              />
            ))}
          </div>

          <div className="py-4">
            <Button
              variant="outline"
              className="w-full"
            >
              <Mails />
              Email Selected Contacts
            </Button>
          </div>
      </section>
    )
}

export default ContactsList
