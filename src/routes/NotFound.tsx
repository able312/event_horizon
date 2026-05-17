import { Link, useLocation } from "react-router";

import { Button } from '~/components/ui/button'

function NotFound() {

  const location = useLocation().pathname

  const goBack = () => {
    window.history.back();
  }

  return (
    <div className="w-full flex flex-col items-center gap-4 p-30">
        <h1 className="text-2xl font-bold">Did You Get Lost on the Back Nine?</h1>
        <p>Looks like we couldn't find { location }</p>
        <Link to="/"><Button className="w-sm">Back to the Dashboard</Button></Link>
        <Button className="w-sm" onClick={ goBack }>Go Back</Button>
    </div>
  );
}

export { NotFound };