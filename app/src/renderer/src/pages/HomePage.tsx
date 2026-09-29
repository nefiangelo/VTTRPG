import React from 'react'
import Sidebar from '../components/Sidebar/Sidebar'

export default function HomePage(): React.JSX.Element {
  return (
    /* Full-screen flex row: sidebar + page content side by side */
    <div className='flex flex-row'>
      <Sidebar />

      {/* Main content area — replace this with your actual content */}
      <main>
        <h1>Home</h1>
        <p>Página inicial (construindo)</p>
      </main>
    </div>
  )
}
