import { cn } from "~/lib/utils"

interface DocumentStyleTextAreaProps {
    className: string | null | undefined,
    placeholderText: string,
    content: string,
    updateContentSource: (content: string) => void
}
const DocumentStyleTextArea:React.FC<DocumentStyleTextAreaProps> = ({
    className,
    placeholderText,
    content,
    updateContentSource,
}) => {


    return(
        <label className="min-w-0 h-full bg-white">
            <textarea
                placeholder={ placeholderText }
                defaultValue={ content }
                onBlur={(e) => updateContentSource(e.target.value)}
                className={cn("max-w-full w-full field-sizing-content resize-none m-0 py-6 px-8 focus-visible:outline-none bg-white", className)}
            />
        </label>
    )
}

export default DocumentStyleTextArea