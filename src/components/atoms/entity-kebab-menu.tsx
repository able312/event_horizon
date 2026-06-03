// import { type ReactNode } from 'react'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from './dropdown-menu'
import { Button } from './button'
import { MoreVertical, Edit, Copy, Trash2 } from 'lucide-react'

type EntityKebabMenuProps = {
    className?: string;
    onEdit?: () => void | Promise<void>;
    onDuplicate?: () => Promise<unknown>;
    onDelete?: () => void | Promise<void>;
    variant?: "ghost" | "glass" | "glass2";
    // children: ReactNode;
}

const EntityKebabMenu = ({ className, variant, onEdit, onDuplicate, onDelete }: EntityKebabMenuProps) => {

    return (
        <>
            <DropdownMenu modal={ false }>
                <DropdownMenuTrigger asChild>
                    <Button variant={ variant } className={className} size="icon">
                        <MoreVertical className="m-0 p-0" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                    { onEdit && <DropdownMenuItem variant='default' onClick={ onEdit }>
                            <Edit className="size-4" /> Edit
                    </DropdownMenuItem> }

                    { onDuplicate && <DropdownMenuItem variant='default' onClick={ onDuplicate }>
                            <Copy className="size-4" /> Duplicate
                    </DropdownMenuItem> }

                    { onDelete && <DropdownMenuItem variant='destructive' onClick={ onDelete }>
                            <Trash2 className="size-4" /> Delete
                    </DropdownMenuItem> }

                </DropdownMenuContent>
            </DropdownMenu>

        </>
    )
}

export { EntityKebabMenu }