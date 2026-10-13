## Select your cookie preferences

We use essential cookies and similar tools that are necessary to provide our site and services. We use performance cookies to collect anonymous statistics, so we can understand how customers use our site and make improvements. Essential cookies cannot be deactivated, but you can choose “Customize” or “Decline” to decline performance cookies.

If you agree, AWS and approved third parties will also use cookies to provide useful site features, remember your preferences, and display relevant content, including relevant advertising. To accept or decline all non-essential cookies, choose “Accept” or “Decline.” To make more detailed choices, choose “Customize.”

AcceptDeclineCustomize

## Customize cookie preferences

We use cookies and similar tools (collectively, "cookies") for the following purposes.

### Essential

Essential cookies are necessary to provide our site and services and cannot be deactivated. They are usually set in response to your actions on the site, such as setting your privacy preferences, signing in, or filling in forms.

Allowed

### Performance

Performance cookies provide anonymous statistics about how customers navigate our site so we can improve site experience and performance. Approved third parties may perform analytics on our behalf, but they cannot use the data for their own purposes.

Allowed

### Functional

Functional cookies help us provide useful site features, remember your preferences, and display relevant content. Approved third parties may set these cookies to provide certain site features. If you do not allow these cookies, then some or all of these services may not function properly.

Allowed

### Advertising

Advertising cookies may be set through our site by us or our advertising partners and help us deliver relevant marketing content. If you do not allow these cookies, you will experience less relevant advertising.

Allowed

Blocking some types of cookies may impact your experience of our sites. You may review and change your choices at any time by selecting Cookie preferences in the footer of this site. We and selected third-parties use cookies or similar technologies as specified in the [AWS Cookie Notice](https://aws.amazon.com/legal/cookies/).

CancelSave preferences

## Your privacy choices

We and our advertising partners (“we”) may use information we collect from or about you to show you ads on other websites and online services. Under certain laws, this activity is referred to as “cross-context behavioral advertising” or “targeted advertising.”

To opt out of our use of cookies or similar technologies to engage in these activities, select “Opt out of cross-context behavioral ads” and “Save preferences” below. If you clear your browser cookies or visit this site from a different device or browser, you will need to make your selection again. For more information about cookies and how we use them, read our [Cookie Notice](https://aws.amazon.com/legal/cookies/).

Allow cross-context behavioral adsOpt out of cross-context behavioral ads

To opt out of the use of other identifiers, such as contact information, for these activities, fill out the form [here](https://pulse.aws/application/ZRPLWLL6?p=0).

For more information about how AWS handles your information, read the [AWS Privacy Notice](https://aws.amazon.com/privacy/).

CancelSave preferences

## Unable to save cookie preferences

We will only store essential cookies at this time, because we were unable to save your cookie preferences.

If you want to change your cookie preferences, try again later using the link in the AWS console footer, or contact support if the problem persists.

Dismiss

 [Skip to main content](https://aws.amazon.com/ebs/pricing/#aws-page-content-main)

Amazon Elastic Block Store

- More


# Amazon EBS pricing

[Get started for free](https://portal.aws.amazon.com/gp/aws/developer/registration/index.html?pg=ebsprice&cta=herobtn)

[Request a pricing quote](https://aws.amazon.com/contact-us/sales-support/?pg=ebsprice&cta=herobtn)

## Overview

With Amazon Elastic Block Store (EBS), you pay only for what you provision. Volume storage for all EBS volume types is charged by the amount of GB you provision per month until you release the storage. Costs increase for EBS volumes that support additional input/output operations per second (IOPS) and throughput beyond baseline performance.

**Pricing Calculator**

[Calculate your Amazon EBS and architecture cost in a single estimate.](https://calculator.aws/#/createCalculator/EBS)

**Free Tier**

AWS Free Tier includes 30 GB of storage, 2 million I/Os, and 1 GB of snapshot storage with Amazon Elastic Block Store (EBS).

Starting July 15, 2025, new AWS customers will receive up to $200 in AWS Free Tier credits, which can be applied towards eligible AWS services, including Amazon EBS. Amazon EBS General Purpose SSD volumes (gp3 and gp2), Throughput Optimized HDD volumes (st1), and Cold HDD volumes (sc1) are available to free tier users. At account sign-up, you can choose between a free plan and a paid plan. The free plan will be available for 6 months after account creation. If you upgrade to a paid plan, any remaining Free Tier credit balance will automatically apply to your AWS bills. All Free Tier credits must be used within 12 months of your account creation date. To learn more about the [AWS Free Tier program](https://aws.amazon.com/free/), refer to AWS Free Tier website and [AWS Free Tier documentation](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier.html).

[View AWS Free Tier details](https://aws.amazon.com/free/)

![hands with calculator](https://d1.awsstatic.com/onedam/marketing-channels/website/aws/en_US/product-categories/compute/approved/images/calc.78a9979fc5d3f024ac8b312766ab5523b9fbb16a.jpeg)

* * *

Region:

Except as otherwise noted, our prices are exclusive of applicable taxes and duties, including VAT and applicable sales tax. For customers with a Japanese billing address, use of AWS is subject to Japanese Consumption Tax. [Learn more »](https://aws.amazon.com/c-tax-faqs/)

## Pricing examples

### Example 1 – General Purpose SSD (gp3) Volumes

Volume storage for General Purpose SSD (gp3) volumes is charged by the amount you provision in GB per month until you release the storage. All gp3 volumes include a free baseline performance of 3,000 provisioned IOPS (input/output operations per second) and 125 provisioned MB/s throughput. Additional IOPS and throughput can be provisioned independently and are charged by the amount you provision in IOPS per month and MB/s per month until you release the IOPS or throughput. Provisioned storage, provisioned IOPS, and provisioned throughput for gp3 volumes will be billed in per-second increments, with a 60-second minimum.

For example, let’s say that you provision a 2,000 GB volume for 12 hours (43,200 seconds) in a 30-day month. Additionally, you provision 10,000 IOPS and 500 MB/s for your volume.

**Gp3 volume charge**:

In a region that charges $0.08 per GB-month, you would be charged:

($0.08 per GB-month \* 2,000 GB \* 43,200 seconds / (86,400 seconds/day \* 30-day month)) = $2.667

**Gp3 IOPS charge**:

In a region that charges $0.005 per provisioned IOPS-month, you would be charged:

($0.005 per provisioned IOPS-month \* (10,000 IOPS provisioned – 3,000 IOPS in the free baseline performance) \* 43,200 seconds /(86,400 seconds /day \* 30-day month))= $0.583

**Gp3 baseline performance charge**:

In a region that charges $0.06 per provisioned MB/s-month, you would be charged:

($0.06 per provisioned MB/s-month \* (500 MB/s provisioned – 125 MB/s in the free baseline performance) \* 43,200 seconds /(86,400 seconds /day \* 30 day-month))= $0.375

**Total charges for example 1**:

Gp3 volume charge = $2.667

Gp3 IOPS charge = $0.583

Gp3 baseline performance charge = $0.375

Total: $3.625 per 30-day month

### Example 2 – EBS General Purpose SSD (gp2) Volumes

Volume storage for General Purpose SSD (gp2) volumes is charged by the amount you provision in GB per month until you release the storage. Provisioned storage for gp2 volumes will be billed in per-second increments, with a 60-second minimum. I/O is included in the price of the volumes, so you pay only for each GB of storage you provision.

**Gp2 volume charge**:

For example, let's say that you provision a 2,000 GB volume for 12 hours (43,200 seconds) in a 30-day month. In a region that charges $0.10 per GB-month, you would be charged:($0.10 per GB-month \* 2,000 GB \* 43,200 seconds / (86,400 seconds/day \* 30 day-month)) = Total: $3.33 per 30-day month

### Example 3 – EBS Provisioned IOPS SSD io2 Volumes

Volume storage for EBS Provisioned IOPS SSD io2 volumes is charged by the amount you provision in GB per month until you release the storage. With Provisioned IOPS SSD io2 volumes, you are also charged by the amount you provision in IOPS (input/output operations per second) per month. The provisioned IOPS charges are tiered. Therefore, as you provision higher IOPS on a single volume, the effective provisioned IOPS charges decrease, making it more economical to scale IOPS on a single volume. Provisioned storage and provisioned IOPS for io2 volumes will be billed in per-second increments, with a 60-second minimum.

For example, let’s say that you provision a 2,000 GB and 1,000 IOPS volume for 12 hours (43,200 seconds) in a 30-day month.

**Initial storage charge**:

In a region that charges $0.125 per GB-month, you would be charged $4.167 for the storage ($0.125 per GB-month \* 2,000 GB \* 43,200 seconds / (86,400 seconds/day \* 30 day-month)).

**Initial IOPS charge**:

In a region that charges $0.065 per provisioned IOPS-month for the first 32,000 IOPS, you would be charged $1.083 for the IOPS that you provisioned ($0.065 per provisioned IOPS-month \* 1,000 IOPS provisioned \* 43,200 seconds /(86,400 seconds /day \* 30-day month)).

Now, let’s say you provision another io2 volume with 2,000 GB and 60,000 IOPS for 12 hours in a 30-day month.

**Additional storage charge**:

In a region that charges $0.125 per GB-month, you would be charged $4.167 for storage.

**Additional IOPS charge**:

In a region that charges $0.065 per provisioned IOPS-month for the first 32,000 IOPS and $0.046 per provisioned IOPS from 32,001 to 64,000 IOPS, you would be charged $56.133 for IOPS that you provisioned (($0.065 per provisioned IOPS-month \* 32,000 IOPS provisioned + $0.046 per provisioned IOPS-month\* (60,000 - 32,000))\*43,200 seconds/(86,400 seconds/day \*30 day-month)).

**High-volume storage charge**:

Similarly, if you provision a volume greater than 64,000 IOPS in an account enabled for io2 Block Express, IOPS above 64,000 will be charged at the rate of the third tier of provisioned IOPS.

**High-volume IOPs charge**:

Note that IOPS tiering is applied at a volume level. Thus, if you provision 10 io2 volumes 1,000 IOPS for 12 hours in a 30-day month, such that cumulatively you have provisioned 100,000 IOPS, your total IOPS charge will be 10 times that in example 1 ($10.83). This is because each volume is provisioned with less than 32,000 IOPS; therefore, for each volume the IOPS are charged at $0.065 per provisioned IOPS.

### Example 4 – EBS Provisioned IOPS SSD (io1) Volumes

Volume storage for EBS Provisioned IOPS SSD (io2 and io1) volumes is charged by the amount you provision in GB per month until you release the storage. With Provisioned IOPS SSD (io1 and io2) volumes, you are also charged by the amount you provision in IOPS (input/output operations per second) per month. Provisioned storage and provisioned IOPS for io1 and io2 volumes will be billed in per-second increments, with a 60-second minimum.

For example, let’s say that you provision a 2,000 GB volume for 12 hours (43,200 seconds) in a 30-day month. In a region that charges $0.125 per GB-month, you would be charged $4.167 for the volume ($0.125 per GB-month \* 2,000 GB \* 43,200 seconds / (86,400 seconds/day \* 30-day month)).

Additionally, you provision 1,000 IOPS for your volume. In a region that charges $0.065 per provisioned IOPS-month, you would be charged $1.083 for the IOPS that you provisioned ($0.065 per provisioned IOPS-month \* 1,000 IOPS provisioned \* 43,200 seconds /(86,400 seconds /day \* 30-day month)).

For this example, the charges would be:

$5.25 ($4.167 + $1.083).

### Example 5 – EBS Throughput Optimized HDD (st1) Volumes

Volume storage for Throughput Optimized HDD (st1) volumes is charged by the amount you provision in GB per month until you release the storage. Provisioned storage for st1 volumes will be billed in per-second increments, with a 60-second minimum. I/O is included in the price of the volumes, so you pay only for each GB of storage you provision.

For example, let's say that you provision a 2,000 GB volume for 12 hours in a 30-day month. In a region that charges $0.045 per GB-month, you would be charged $1.50 for the volume ($0.045 per GB-month \* 2,000 GB \* 43,200 seconds / (86,400 seconds /day \* 30 day-month)).

### Example 6 – EBS Cold HDD (sc1) Volumes

Volume storage for Cold HDD (sc1) volumes is charged by the amount you provision in GB per month until you release the storage. Provisioned storage for sc1 volumes will be billed in per-second increments, with a 60-second minimum. I/O is included in the price of the volumes, so you pay only for each GB of storage you provision.

For example, let's say that you provision a 2,000 GB volume for 12 hours (43,200 seconds) in a 30-day month. In a region that charges $0.015 per GB-month, you would be charged $0.50 for the volume ($0.015 per GB-month \* 2,000 GB \* 43,200 seconds / (86,400 seconds/day \* 30-day month)).

### Example 7 – EBS Snapshots

Snapshot storage is based on the amount of space your data consumes in Amazon Simple Storage Service (Amazon S3). Because Amazon EBS does not save empty blocks, it is likely that the snapshot size will be considerably less than your volume size. For the first snapshot of a volume, Amazon EBS saves a full copy of your data to Amazon S3. For each incremental snapshot, only the changed part of your Amazon EBS volume is saved. Copying EBS snapshots is charged for the data transferred across regions. After the snapshot is copied, standard EBS snapshot charges apply for storage in the destination region.

### Example 8 – EBS Fast Snapshot Restore

Example pricing is based on the US-East (N. Virginia) region. Fast Snapshot Restore (FSR) is charged in Data Services Unit-Hours (DSU-Hours) for each snapshot and each Availability Zone in which it is enabled. DSUs are billed per minute with a one-hour minimum. You will continue to incur charges until you disable FSR on a snapshot. The price of 1 DSU-Hour is $0.75.

For example, you enable FSR on an EBS Snapshot in three Availability Zones (AZs) and you disable it after 90 minutes. The price of one DSU-Hour is $0.75. Since FSR was enabled on one snapshot for 90 minutes in three AZs, you will be billed as 1 snapshot \* 3 AZs \* 1.5 DSU-hours at $0.75 per DSU-Hour or $3.375.

As another example, you enable FSR on an EBS Snapshot in one Availability Zone, and you disable it after 45 minutes. The price of 1 FSR DSU-Hour is $0.75. Since there is a one-hour minimum, you will be billed as 1 snapshot \* 1 AZ \* one DSU-Hour at $0.75 per DSU-Hour or $0.75.

Let’s consider another example where you enable FSR on three snapshots in two Availability Zones, and you disable it after 2.5 hours. Since FSR was enabled for 2.5 hours (150 minutes) on 3 snapshots and in 2 AZs, you will be billed as 3 snapshots \* 2 AZs \* 2.5 DSU-hours at $0.75 per FSR DSU-Hour or $11.25.

### Example 9 – EBS direct APIs for Snapshots

EBS direct APIs for Snapshots provide the ability to create EBS snapshots from data regardless of where it resides—for example, data on-premises. These APIs also provide the ability to directly read EBS snapshot data and identify differences between two snapshots. The following charges apply for these APIs.

ListChangedBlocks and ListSnapshotBlocks APIs are charged per request. If you make one million ListSnapshotBlocks API calls in a region that charges $0.0006 per thousand requests, you will be charged $0.60 ($0.0006 per thousand requests \* 1 million requests).

GetSnapshotBlock API is charged per SnapshotAPIUnit. One GetSnapshotBlock API request uses a block size of 512 KiB and consumes one SnapshotAPIUnit. Note that 512 KiB is the only block size supported today, so each GetSnapshotBlock request consumes one SnapshotAPIUnit. For example, if you make 100,000 GetSnapshotBlock API calls using a block size of 512 KiB in a region that charges $0.003 per thousand SnapshotAPIUnits, you will be charged $0.30 ($0.003 per thousand SnapshotAPIUnits \* 100,000 SnapshotAPIUnits).

PutSnapshotBlock API is charged per SnapshotAPIUnit. One PutSnapshotBlock API request uses a block size of 512 KiB and consumes one SnapshotAPIUnit. Note that 512 KiB is the only block size supported today, so each PutSnapshotBlock request consumes one SnapshotAPIUnit. For example, if you make 100,000 PutSnapshotBlock API calls using a block size of 512 KiB in a region that charges $0.006 per thousand SnapshotAPIUnits, you will be charged $0.60 ($0.006 per thousand SnapshotAPIUnits \* 100,000 SnapshotAPIUnits).

Note: If you use external or cross-region data transfers, additional [EC2 data transfer](https://aws.amazon.com/ec2/pricing/) charges will apply. If you delete any snapshots after initiation, you will still need to pay for the data that has already been transferred.

### Example 10 – EBS Snapshots Archive

When you archive an EBS snapshot, a full copy of the snapshot is stored in the EBS Snapshots Archive tier. Let’s say that you take an EBS snapshot of an EBS volume that is 1,000 GB in size, and that at the time when the snapshot is taken, 200 GB of data has been written to the volume. If you archive this snapshot, an archived snapshot that is 200 GB in size is created and stored in the EBS Snapshots Archive tier. In a Region that charges $0.0125 per GB-month for the EBS Snapshots Archive storage, you are charged $2.50 in storage charges for the snapshot archive in a 30-day month. ($0.0125 per GB-month \* 200 GB).

Let’s say that you temporarily restore the 200 GB snapshot from the archive tier for a period of 15 days. In this same Region, you are charged a one-time retrieval fee of $6 ($0.03 per GB \*200 GB). For this Region, with a $0.05 per GB-month for EBS Snapshots Standard storage, the restored snapshot incurs charges of $5 for the period of 15 days ($0.05 per GB-month \* 200 GB\* 15 days/30 days). When the 15-day restore period expires, the snapshot is tiered back to archive, and you are no longer charged for the copy in the standard tier. Note that, for temporary restores, the copy of the snapshot in the archive is retained. You will continue to incur storage charges for the snapshot copy in the archive tire at the rate of $0.0125 per GB-month.

There is a 90-day minimum retention period for snapshots stored in EBS Snapshots Archive. If you delete the 200 GB snapshot or permanently restore it from archive earlier than 90 days, you are billed for the storage charges for the remaining retention time. For example, if you delete the archived snapshot after 70 days, 11 hours and 5 minutes, you are charged $1.625 for the remaining retention period of 19 days, 12 hours and 55 minutes, rounded down to the nearest hour, i.e., 19 days and 12 hours ($0.0125 per GB-month \* 200 GB \* (19 days \* 24 hours + 12 hours)/ (24 hours/day \* 30-day month).

Looking for information about EBS Magnetic volumes? See [Amazon EBS Previous Generation Volumes](https://aws.amazon.com/ebs/previous-generation/).

### Example 11 – EBS Time-based Snapshot Copy

Time-based Copy for EBS Snapshots provides the ability to copy EBS Snapshots within a predictable and consistent timeframe that is specified by you in the Copy request. When you copy an EBS Snapshot using the Time-based Copy feature, you are charged based on the amount of data copied and the specified completion duration.

For example, you transfer 3000 GB of snapshot data in a given day and specify a completion duration of 8 hours for the entire copy job. The price of Time-based Copy data transfer per GB is $0.010 for the completion duration of 8 hours. You will be billed as 3000 GB \* $0.010 per GB or $30.

As another example, if you copy snapshots of size 1000 GB of your mission critical database within 1 hour, and another database of size 3000 GB within 3 hours, you will be billed 1000 GB \* $0.016 per GB or $16 for the first database and 3000 GB \* $0.014 per GB or $42 for the second database.

Note: If you use external or cross-region data transfers, additional [EC2 data transfer](https://aws.amazon.com/ec2/pricing/) charges will apply. If you delete any snapshots after initiation, you will still need to pay for the data that has already been copied.

### Example 12 - Provisioned Rate for Volume Initialization

Amazon EBS Provisioned Rate for Volume Initialization allows you to create fully performant EBS volumes within a predictable amount of time. You can use this feature to speed up the initialization of hundreds of concurrent volumes and instances. You can also use this feature when you need to recover from an existing EBS Snapshot and need your EBS volume to be created and initialized as quickly as possible. You can use this feature to quickly create copies of EBS volumes with EBS Snapshots in a different Availability Zone, AWS Region, or account. Provisioned Rate for Volume Initialization for each volume is charged based on the full snapshot size and the specified volume initialization rate.

For example, let’s assume you have an EBS Snapshot that is created from an EBS volume that is provisioned for 20 GB and has full snapshot size of 10 GB (represents the size of all the blocks that were written to the source volume at the time the snapshot was created). If you want to use volume initialization rate of 300 MB/s to create 100 volumes from this snapshot in a region that charges $0.0036 per GB for 300 MB/s, then you will be billed a total of $3.6 (100 volumes x 10 GB per volume x $0.0036 per GiB).

Please note the cost for Provisioned Rate for Volume Initialization is independent of your EBS volume costs.

**\*on this page, GB = 1024^3 bytes**

### Example 13 - Amazon EBS Volume Clones

Amazon EBS Volume Clones allows you to instantly create copies of your EBS volumes within the same Availability Zone. When you create a copy using Volume Clones, you are charged based on the size of the written blocks of the source volume at the time of clone creation.

For example, let's assume you have a source EBS volume that is provisioned for 1000 GB, and has an allocated size of 600 GB (represents the size of all the blocks that were written to the source volume at the time the clone was initiated). If you create a clone of this volume in a region that charges $0.00080 per GB, you will be billed $0.48 (600 GB x $0.00080 per GB). Please note that the cost for Volume Clones is independent of your EBS volume costs. The resulting copied volume will be charged separately as a standard EBS volume.

## Additional pricing resources

[AWS Pricing Calculator](https://calculator.aws/)

Easily calculate your monthly costs with AWS.

[Get pricing assistance](https://aws.amazon.com/contact-us/sales-support-pricing/)

Contact AWS specialists to get a personalized quote.

## Next steps

[Tutorial\\
\\
**Explore hands-on training**\\
\\
Get started with a tutorial\\
\\
![](https://d1.awsstatic.com/onedam/marketing-channels/website/aws/en_US/product-categories/networking/approved/images/be6bb18c-e958-472e-be9e-f387d1b2ad33.f5139d7c6acbefce5b3eb31fe7a1c5198e7e60a5.jpeg)](https://docs.aws.amazon.com/hands-on/latest/amazon-ebs-backup-and-restore-using-aws-backup/amazon-ebs-backup-and-restore-using-aws-backup.html?pg=ln&sec=hs)

[Free tier\\
\\
**Try the Amazon EBS Free Tier**\\
\\
Try the AWS Free Tier\\
\\
![](https://d1.awsstatic.com/onedam/marketing-channels/website/aws/en_US/product-categories/compute/approved/images/975ea31b-e624-417d-979b-71df76f642de.1eb0483dbf13e8892b388a5bce6b9645172d26d7.jpeg)](https://aws.amazon.com/free/?pg=ln&sec=hs)

[Contact us\\
\\
**Connect with an expert**\\
\\
Explore support options\\
\\
![](https://d1.awsstatic.com/onedam/marketing-channels/website/aws/en_US/product-categories/cloud-financial-management/approved/images/f8a1d692-81b0-4022-a998-3cf7968c47f7.ca80664124c9b420dc667a8fba7c6437728a9b7f.jpeg)](https://aws.amazon.com/contact-us/sales-support/?pg=ln&sec=hs)

Hi, I can connect you with an AWS representative or answer questions you have on AWS.

Need more info? Highlight any text to get an explanation generated with AWS generative AI.

2