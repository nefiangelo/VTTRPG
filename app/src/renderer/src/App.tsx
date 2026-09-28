import Versions from './components/Versions'
// import electronLogo from './assets/electron.svg'
import LoginPage from './pages/LoginPage'

function App(): React.JSX.Element {

  const userLogged = false;
  let actPage: React.JSX.Element;

  userLogged ? actPage = <Versions /> : actPage = <LoginPage />;

  return actPage;


}

export default App
