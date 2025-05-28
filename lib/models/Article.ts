export interface Article {
  _id: string
  id: string
  num: number
  title: string
  topic: string[]
  subtopic: string[]
  categories: string
  submitter: string
  "journal-ref"?: string
  doi?: string
  "report-no"?: string
  license?: string
  abstract: string
  authors_parsed: [string, string, string][]
  keywords: string[]
  publishDate?: string
  readTime?: string
  likes?: number
  satisfaction?: number
}
