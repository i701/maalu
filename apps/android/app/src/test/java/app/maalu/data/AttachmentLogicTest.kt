package app.maalu.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test

class AttachmentLogicTest {
    @Test fun sizesReadPlainly() {
        assertEquals("850 B", humanSize(850)); assertEquals("1.0 KB", humanSize(1024)); assertEquals("2.5 MB", humanSize(2_621_440))
    }

    @Test fun fileRules() {
        assertNull(attachmentProblem(2_000_000, 3))
        assertNotNull(attachmentProblem(0, 0)); assertNotNull(attachmentProblem(MAX_ATTACHMENT_BYTES + 1, 0)); assertNotNull(attachmentProblem(10, MAX_ATTACHMENTS))
        assertNull(attachmentProblem(MAX_ATTACHMENT_BYTES, MAX_ATTACHMENTS - 1))
    }

    @Test fun linksAreLabelledAndChecked() {
        assertEquals("My order", linkLabel(TxLink("1", "https://shop.example/o/1", "My order")))
        assertEquals("shop.example/o/1", linkLabel(TxLink("1", "https://shop.example/o/1/", null)))
        assertEquals("shop.example", linkLabel(TxLink("1", "http://shop.example", " ")))
        assertEquals("""{"url":"shop.example","title":"Order"}""", linkJson(" shop.example ", " Order ").toString())
        assertEquals("""{"url":"a.b"}""", linkJson("a.b", "").toString())
        assertNotNull(linkProblem("", 0)); assertNotNull(linkProblem("a b", 0)); assertNotNull(linkProblem("a.b", MAX_LINKS)); assertNull(linkProblem("a.b", 2))
    }

    @Test fun summary() {
        assertNull(attachedSummary(0, 0)); assertEquals("1 file", attachedSummary(1, 0)); assertEquals("2 files · 1 link", attachedSummary(2, 1))
    }
}
