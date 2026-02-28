import { prisma } from './prisma'

/**
 * Normalize artist name for database lookup
 * Uses lowercase.trim() to match the normalization used in chart entries
 */
export function normalizeArtistName(name: string): string {
  return name.toLowerCase().trim()
}

/**
 * Calculate image score (upvotes - downvotes)
 */
export function calculateImageScore(upvotes: number, downvotes: number): number {
  return upvotes - downvotes
}

/**
 * Get the selected artist image (highest score)
 * Returns the image URL of the image with the highest positive score, or null if no images exist
 */
export async function getSelectedArtistImage(artistName: string): Promise<string | null> {
  const normalizedName = normalizeArtistName(artistName)
  
  // Get all images for this artist with vote counts
  const images = await prisma.artistImage.findMany({
    where: {
      artistName: normalizedName,
    },
    include: {
      votes: true,
    },
    orderBy: {
      uploadedAt: 'desc',
    },
  })

  if (images.length === 0) {
    return null
  }

  // Calculate score for each image
  const imagesWithScores = images.map(image => {
    const upvotes = image.votes.filter(v => v.voteType === 'up').length
    const downvotes = image.votes.filter(v => v.voteType === 'down').length
    const score = calculateImageScore(upvotes, downvotes)
    return {
      ...image,
      upvotes,
      downvotes,
      score,
    }
  })

  // Sort by score (highest first), then by upload date (newest first) for tie-breaker.
  // This ensures we always pick the best-voted image for group covers, drill-down, etc.
  const sorted = [...imagesWithScores].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return b.uploadedAt.getTime() - a.uploadedAt.getTime()
  })
  const topImage = sorted[0]

  // Only return if the best image has non-negative score (don't show downvoted images)
  return topImage.score >= 0 ? topImage.imageUrl : null
}

/**
 * Get all images for an artist with vote counts and user's vote status
 */
export async function getArtistImages(
  artistName: string,
  userId?: string
): Promise<Array<{
  id: string
  imageUrl: string
  uploadedBy: string
  uploadedByUser: {
    id: string
    name: string | null
    lastfmUsername: string
  }
  uploadedAt: Date
  upvotes: number
  downvotes: number
  score: number
  userVote: 'up' | 'down' | null
}>> {
  const normalizedName = normalizeArtistName(artistName)
  
  const images = await prisma.artistImage.findMany({
    where: {
      artistName: normalizedName,
    },
    include: {
      uploadedByUser: {
        select: {
          id: true,
          name: true,
          lastfmUsername: true,
        },
      },
      votes: userId ? {
        where: {
          userId: userId,
        },
      } : true,
    },
    orderBy: {
      uploadedAt: 'desc',
    },
  })

  // Calculate scores and get user's vote
  return images.map(image => {
    const allVotes = image.votes
    const upvotes = allVotes.filter(v => v.voteType === 'up').length
    const downvotes = allVotes.filter(v => v.voteType === 'down').length
    const score = calculateImageScore(upvotes, downvotes)
    
    // Get user's vote if authenticated
    let userVote: 'up' | 'down' | null = null
    if (userId) {
      const userVoteRecord = allVotes.find(v => v.userId === userId)
      if (userVoteRecord) {
        userVote = userVoteRecord.voteType as 'up' | 'down'
      }
    }

    return {
      id: image.id,
      imageUrl: image.imageUrl,
      uploadedBy: image.uploadedBy,
      uploadedByUser: image.uploadedByUser,
      uploadedAt: image.uploadedAt,
      upvotes,
      downvotes,
      score,
      userVote,
    }
  }).sort((a, b) => {
    // Sort by score (highest first), then by upload date (newest first) if scores are equal
    if (b.score !== a.score) {
      return b.score - a.score
    }
    return b.uploadedAt.getTime() - a.uploadedAt.getTime()
  })
}
