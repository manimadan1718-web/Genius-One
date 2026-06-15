import '../styles/globals.css'
import Head from 'next/head'
import { Toaster } from 'react-hot-toast'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>GeniusOne Typing Portal</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </Head>
      <Toaster position="top-right" toastOptions={{ duration: 3000, style: { fontSize: '13px' } }} />
      <Component {...pageProps} />
    </>
  )
}
