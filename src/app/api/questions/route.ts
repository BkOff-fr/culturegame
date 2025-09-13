import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const difficulty = searchParams.get('difficulty')
    const limit = parseInt(searchParams.get('limit') || '10')
    const isPublic = searchParams.get('public') === 'true'
    const categories = searchParams.get('categories') // Support pour multiple catégories

    const where: any = {}
    
    // Gestion des catégories multiples
    if (categories && categories !== 'all') {
      const categoryArray = categories.split(',').filter(c => c !== 'all')
      if (categoryArray.length > 0) {
        where.category = { in: categoryArray }
      }
    } else if (category && category !== 'all') {
      where.category = category
    }
    
    if (difficulty && difficulty !== 'all') {
      where.difficulty = difficulty
    }
    
    if (isPublic) {
      where.isPublic = true
    }

    // Récupérer toutes les questions matchantes
    const allQuestions = await prisma.question.findMany({
      where,
      select: {
        id: true,
        type: true,
        question: true,
        data: true,
        category: true,
        difficulty: true,
        points: true,
        timeLimit: true,
        isPublic: true,
        createdBy: {
          select: {
            username: true,
            avatar: true
          }
        }
      }
    })

    // Mélanger aléatoirement et prendre le nombre demandé
    const shuffledQuestions = allQuestions.sort(() => Math.random() - 0.5)
    const questions = shuffledQuestions.slice(0, limit)

    console.log(`Questions API: Found ${allQuestions.length} total, returning ${questions.length} shuffled questions`)

    return NextResponse.json({ questions })
  } catch (error) {
    console.error('Questions fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const {
      type,
      question,
      data,
      category,
      difficulty = 'MEDIUM',
      points = 100,
      timeLimit = 30,
      isPublic = false
    } = await request.json()

    if (!type || !question || !data || !category) {
      return NextResponse.json({ 
        error: 'Missing required fields: type, question, data, category' 
      }, { status: 400 })
    }

    const newQuestion = await prisma.question.create({
      data: {
        type,
        question,
        data,
        category,
        difficulty,
        points,
        timeLimit,
        isPublic,
        createdById: payload.userId
      },
      include: {
        createdBy: {
          select: {
            username: true,
            avatar: true
          }
        }
      }
    })

    return NextResponse.json({ question: newQuestion })
  } catch (error) {
    console.error('Question creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}