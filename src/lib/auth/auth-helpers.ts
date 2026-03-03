import { supabase } from './supabase'
import { prisma } from '@/lib/db'
import { createPrivyWallet } from '@/lib/wallet/privy'

export async function signUp(email: string, password: string, username: string) {
  try {
    // Create Supabase user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username
        }
      }
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('Failed to create user')

    // Create Privy embedded wallet
    let walletAddress: string
    try {
      const privyWallet = await createPrivyWallet(authData.user.id)
      walletAddress = privyWallet.address
    } catch (walletError) {
      console.error('Failed to create Privy wallet, using placeholder:', walletError)
      // Fallback to placeholder for development
      walletAddress = `0x${Math.random().toString(16).substr(2, 40)}`
    }

    // Create user in our database
    const user = await prisma.user.create({
      data: {
        id: authData.user.id,
        email,
        username,
        walletAddress
      }
    })

    return { user, authData }
  } catch (error) {
    console.error('Sign up error:', error)
    throw error
  }
}

export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Sign in error:', error)
    throw error
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  } catch (error) {
    console.error('Sign out error:', error)
    throw error
  }
}

export async function getCurrentUser() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch (error) {
    console.error('Get current user error:', error)
    return null
  }
}
