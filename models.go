package main

type Book struct {
	BookNumber   int    `json:"bookNumber"`
	ShortName    string `json:"shortName"`
	LongName     string `json:"longName"`
	Color        string `json:"color"`
	ChapterCount int    `json:"chapterCount"`
}

type Verse struct {
	BookNumber int    `json:"bookNumber"`
	Chapter    int    `json:"chapter"`
	Verse      int    `json:"verse"`
	Text       string `json:"text"`
}

type SearchResult struct {
	BookNumber int    `json:"bookNumber"`
	Chapter    int    `json:"chapter"`
	Verse      int    `json:"verse"`
	Text       string `json:"text"`
	BookName   string `json:"bookName"`
}

type TranslationInfo struct {
	Name        string `json:"name"`
	DisplayName string `json:"displayName"`
	FileName    string `json:"fileName"`
}

type Bookmark struct {
	ID          int    `json:"id"`
	BookNumber  int    `json:"bookNumber"`
	Chapter     int    `json:"chapter"`
	Verse       int    `json:"verse"`
	Translation string `json:"translation"`
	Note        string `json:"note"`
	CreatedAt   string `json:"createdAt"`
}

type Highlight struct {
	ID          int    `json:"id"`
	BookNumber  int    `json:"bookNumber"`
	Chapter     int    `json:"chapter"`
	Verse       int    `json:"verse"`
	Color       string `json:"color"`
	Translation string `json:"translation"`
	CreatedAt   string `json:"createdAt"`
}

type Note struct {
	ID          int    `json:"id"`
	BookNumber  int    `json:"bookNumber"`
	Chapter     int    `json:"chapter"`
	Verse       int    `json:"verse"`
	Content     string `json:"content"`
	Translation string `json:"translation"`
	CreatedAt   string `json:"createdAt"`
}

type VerseList struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Translation string `json:"translation"`
	CreatedAt   string `json:"createdAt"`
}

type VerseListItem struct {
	ID          int    `json:"id"`
	ListID      int    `json:"listId"`
	BookNumber  int    `json:"bookNumber"`
	Chapter     int    `json:"chapter"`
	Verse       int    `json:"verse"`
	SortOrder   int    `json:"sortOrder"`
	CreatedAt   string `json:"createdAt"`
}
