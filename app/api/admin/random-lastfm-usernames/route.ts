import { NextResponse } from 'next/server'
import { requireSuperuserApi } from '@/lib/admin'
import { acquireLastFMRateLimit } from '@/lib/lastfm-rate-limiter'

const LASTFM_API_BASE = 'https://ws.audioscrobbler.com/2.0/'

export async function GET(request: Request) {
  try {
    // Check superuser access
    await requireSuperuserApi()

    const { searchParams } = new URL(request.url)
    const count = parseInt(searchParams.get('count') || '20', 10)
    const limit = Math.min(Math.max(count, 1), 50) // Limit between 1 and 50

    const apiKey = process.env.LASTFM_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Last.fm API key not configured' },
        { status: 500 }
      )
    }

    const usernames = new Set<string>()

    // Seed users - known active Last.fm users to start from
    // These are popular Last.fm users that likely have many friends
    const seedUsers = [
      'rj',           // Last.fm founder
      'tomah',        // Popular user
      'cocorambo',     // Popular user
      'marcusj',       // Popular user
      'drscientist',   // Popular user
    ]

    try {
      // Get friends from seed users
      for (const seedUser of seedUsers) {
        if (usernames.size >= limit) break

        try {
          await acquireLastFMRateLimit(1)
          const friendsResponse = await fetch(
            `${LASTFM_API_BASE}?method=user.getfriends&user=${encodeURIComponent(seedUser)}&api_key=${apiKey}&format=json&limit=50`
          )

          if (friendsResponse.ok) {
            const friendsData = await friendsResponse.json()
            
            // Check for Last.fm API errors
            if (friendsData.error) {
              console.warn(`Last.fm API error for user ${seedUser}:`, friendsData.message || friendsData.error)
              continue
            }

            const friends = friendsData?.friends?.user || []
            const friendList = Array.isArray(friends) ? friends : [friends]

            console.log(`Found ${friendList.length} friends for seed user ${seedUser}`)

            for (const friend of friendList) {
              if (usernames.size >= limit) break
              const username = friend?.name || friend?.username
              if (username && typeof username === 'string' && username.trim().length > 0) {
                usernames.add(username.trim())
              }
            }
          } else {
            const errorText = await friendsResponse.text()
            console.warn(`Failed to fetch friends for ${seedUser}: ${friendsResponse.status} - ${errorText}`)
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200))
        } catch (error) {
          console.error(`Error fetching friends for seed user ${seedUser}:`, error)
          // Continue with next seed user
        }
      }

      // If we still need more usernames, try getting friends of friends (limited depth)
      if (usernames.size < limit) {
        const currentUsernames = Array.from(usernames)
        const additionalUsers = currentUsernames.slice(0, Math.min(3, currentUsernames.length))

        for (const user of additionalUsers) {
          if (usernames.size >= limit) break

          try {
            await acquireLastFMRateLimit(1)
            const friendsResponse = await fetch(
              `${LASTFM_API_BASE}?method=user.getfriends&user=${encodeURIComponent(user)}&api_key=${apiKey}&format=json&limit=30`
            )

            if (friendsResponse.ok) {
              const friendsData = await friendsResponse.json()
              
              if (friendsData.error) {
                console.warn(`Last.fm API error for user ${user}:`, friendsData.message || friendsData.error)
                continue
              }

              const friends = friendsData?.friends?.user || []
              const friendList = Array.isArray(friends) ? friends : [friends]

              console.log(`Found ${friendList.length} friends for user ${user}`)

              for (const friend of friendList) {
                if (usernames.size >= limit) break
                const username = friend?.name || friend?.username
                if (username && typeof username === 'string' && username.trim().length > 0) {
                  usernames.add(username.trim())
                }
              }
            }

            await new Promise(resolve => setTimeout(resolve, 200))
          } catch (error) {
            console.error(`Error fetching friends for user ${user}:`, error)
          }
        }
      }

      const usernameArray = Array.from(usernames).slice(0, limit)

      console.log(`Total unique usernames collected: ${usernameArray.length}`)

      return NextResponse.json({
        usernames: usernameArray,
        count: usernameArray.length,
      })
    } catch (error: any) {
      console.error('Error fetching random Last.fm usernames:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch random usernames' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unauthorized' },
      { status: error.status || 401 }
    )
  }
}
