'use client'

import React from 'react'
import { Button } from './ui/button'
import { signOut } from 'next-auth/react'

const UserAccountnav = () => {
  return (
    <Button className='inline-flex items-center px-4 py-2 bg-red-600 text-white hover:bg-red-700 transition shadow'
    onClick={()=> signOut(
        {
            redirect:true,
            callbackUrl: `${window.location.origin}/sign-in`
        }
    )}>
        Sign Out
    </Button>
  )
}

export default UserAccountnav