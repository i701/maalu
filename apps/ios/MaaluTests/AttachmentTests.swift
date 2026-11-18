import CoreGraphics
import Foundation
import ImageIO
import Testing
import UniformTypeIdentifiers
@testable import Maalu

struct AttachmentTests {
    private func png(width: Int, height: Int) throws -> Data {
        let context = try #require(CGContext(data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: 0,
                                             space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue))
        context.setFillColor(red: 0.2, green: 0.6, blue: 0.9, alpha: 1)
        context.fill(CGRect(x: 0, y: 0, width: width, height: height))
        let image = try #require(context.makeImage())
        let output = NSMutableData()
        let destination = try #require(CGImageDestinationCreateWithData(output, UTType.png.identifier as CFString, 1, nil))
        CGImageDestinationAddImage(destination, image, nil)
        #expect(CGImageDestinationFinalize(destination))
        return output as Data
    }

    @Test func aPhotoBecomesAJpegNoLargerThanTheLimit() throws {
        let jpeg = try #require(ReceiptImage.jpeg(from: try png(width: 400, height: 200), maxPixels: 100))
        #expect(jpeg.starts(with: [0xFF, 0xD8]))
        let source = try #require(CGImageSourceCreateWithData(jpeg as CFData, nil))
        let properties = try #require(CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any])
        #expect(properties[kCGImagePropertyPixelWidth] as? Int == 100)
    }

    @Test func somethingThatIsNotAnImageIsRefused() {
        #expect(ReceiptImage.jpeg(from: Data("not an image".utf8)) == nil)
    }

    @Test func tooManyOrTooLargeFilesAreRefused() {
        let small = Data(count: 10)
        #expect(PendingAttachment.problem(adding: small, to: []) == nil)
        #expect(PendingAttachment.problem(adding: Data(count: PendingAttachment.maxBytes + 1), to: []) != nil)
        let full = (0..<PendingAttachment.maxCount).map { _ in PendingAttachment(filename: "a.pdf", data: small, contentType: "application/pdf") }
        #expect(PendingAttachment.problem(adding: small, to: full) != nil)
    }
}
