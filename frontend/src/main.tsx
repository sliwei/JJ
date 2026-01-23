import { Provider } from 'jotai'
import { createRoot } from 'react-dom/client'

import App from './App.tsx'
import { myStore } from './store/global'

createRoot(document.getElementById('root')!).render(
  <Provider store={myStore}>
    <App />
  </Provider>
)
