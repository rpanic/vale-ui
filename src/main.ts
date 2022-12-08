import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import naive from 'naive-ui'

/* import the fontawesome core */
import { library } from '@fortawesome/fontawesome-svg-core'

/* import font awesome icon component */
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

import {faCheck, faTrash} from '@fortawesome/free-solid-svg-icons'
import { faChevronDown } from '@fortawesome/free-solid-svg-icons'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import { faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons'
import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons'
import { faWallet } from '@fortawesome/free-solid-svg-icons'
import { faArrowRightToBracket } from '@fortawesome/free-solid-svg-icons'
import { faArrowRightFromBracket } from '@fortawesome/free-solid-svg-icons'
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons'
import { faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { faXmark } from '@fortawesome/free-solid-svg-icons'
import { faPlus } from '@fortawesome/free-solid-svg-icons'
import { faCirclePlus } from '@fortawesome/free-solid-svg-icons'

library.add(faCheck, faChevronDown, faSpinner, faArrowUpRightFromSquare, faExternalLinkAlt, faWallet,faArrowRightToBracket,faArrowRightFromBracket,faChevronLeft,faXmark,faPlus,faChevronRight,faCirclePlus,faTrash, faXmark )

import './assets/main.css'
import './assets/tx.css'

const app = createApp(App)
    .component('font-awesome-icon', FontAwesomeIcon) 

app.use(router)
app.use(naive)

app.mount('#app')
